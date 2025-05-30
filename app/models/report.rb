# frozen_string_literal: true

# == Schema Information
#
# Table name: reports
#
#  id                   :integer          not null, primary key
#  author_id            :integer
#  file_name            :string
#  file_description     :text
#  configs              :text
#  sample_settings      :text
#  reaction_settings    :text
#  objects              :text
#  img_format           :string
#  file_path            :string
#  generated_at         :datetime
#  deleted_at           :datetime
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  template             :string           default("standard")
#  mol_serials          :text             default([])
#  si_reaction_settings :text             default({"Name"=>true, "CAS"=>true, "Formula"=>true, "Smiles"=>true, "InCHI"=>true, "Molecular Mass"=>true, "Exact Mass"=>true, "EA"=>true})
#  prd_atts             :text             default([])
#  report_templates_id  :integer
#
# Indexes
#
#  index_reports_on_author_id            (author_id)
#  index_reports_on_file_name            (file_name)
#  index_reports_on_report_templates_id  (report_templates_id)
#

class Report < ApplicationRecord
  acts_as_paranoid

  serialize :configs, Hash
  serialize :sample_settings, Hash
  serialize :reaction_settings, Hash
  serialize :si_reaction_settings, Hash
  serialize :objects, Array
  serialize :mol_serials, Array
  serialize :prd_atts, Array

  has_many :reports_users
  has_many :users, through: :reports_users
  has_many :attachments, as: :attachable
  belongs_to :report_templates, optional: true

  default_scope { includes(:reports_users) }

  after_destroy :delete_archive
  after_destroy :delete_job

  def create_docx
    if ReportTemplate.where(id: report_templates_id).present?
      report_template = ReportTemplate.includes(:attachment).find(report_templates_id)
      template = report_template.report_type
      #     tpl_path = if report_template.attachment
      #                  report_template.attachment.attachment_url
      #                else
      #                  report_template.report_type
      #                end
    end
    tpl_path = self.class.template_path(template)
    case template
    when 'spectrum'
      Reporter::WorkerSpectrum.new(
        report: self, template_path: tpl_path,
      ).process
    when 'supporting_information'
      Reporter::WorkerSi.new(
        report: self, template_path: tpl_path, std_rxn: false,
      ).process
    when 'supporting_information_std_rxn'
      Reporter::WorkerSi.new(
        report: self, template_path: tpl_path, std_rxn: true,
      ).process
    when 'rxn_list_xlsx'
      Reporter::WorkerRxnList.new(
        report: self, ext: 'xlsx',
      ).process
    when 'rxn_list_csv'
      Reporter::WorkerRxnList.new(
        report: self, ext: 'csv',
      ).process
    when 'rxn_list_html'
      Reporter::WorkerRxnList.new(
        report: self, template_path: tpl_path, ext: 'html',
      ).process
    when 'doi_list_xlsx'
      Reporter::WorkerDoiList.new(
        report: self, ext: 'xlsx'
      ).process
    else
      Reporter::Worker.new(
        report: self, template_path: tpl_path,
      ).process
    end
  end
  handle_asynchronously(:create_docx, run_at: proc { 30.seconds.from_now }) unless Rails.env.development?

  def queue_name
    #"report_#{id}"
    'report'
  end

  def self.create_reaction_docx(current_user, user_ids, params)
    file_name = docx_file_name(params[:template])
    docx = docx_file(current_user, user_ids, params)
    [docx, file_name]
  end

  def self.docx_file(current_user, user_ids, params)
    reaction = Reaction.find(params[:id])
    serialized_reaction = Entities::ReactionReportEntity.represent(
      reaction,
      current_user: current_user,
      detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: reaction).detail_levels,
    ).serializable_hash
    content = Reporter::Docx::Document.new(objs: [serialized_reaction]).convert
    tpl_path = template_path(params[:template])
    Sablon.template(tpl_path)
          .render_to_string(merge(current_user,
                                  content,
                                  all_spl_settings,
                                  all_rxn_settings,
                                  all_configs))
  end

  def self.docx_file_name(template)
    now = Time.now.strftime('%Y-%m-%dT%H-%M-%S')
    case template
    when 'supporting_information'
      "Supporting_Information_#{now}.docx"
    when 'supporting_information_std_rxn'
      "Supporting_Information_Standard_Reaction_#{now}.docx"
    when 'single_reaction'
      "ELN_Reaction_#{now}.docx"
    else
      "ELN_Report_#{now}.docx"
    end
  end

  def self.template_path(template)
    case template
    when 'supporting_information'
      Rails.root.join('lib', 'template', 'Supporting_information.docx')
    when 'supporting_information_std_rxn'
      Rails.root.join('lib', 'template', 'Supporting_information.docx')
    when 'spectrum'
      Rails.root.join('lib', 'template', 'Spectra.docx')
    when 'single_reaction'
      Rails.root.join('lib', 'template', 'Standard.docx')
    when 'rxn_list_html'
      Rails.root.join('lib', 'template', 'rxn_list.html.erb')
    else
      Rails.root.join('lib', 'template', 'Standard.docx')
    end
  end

  def self.merge(current_user, contents, spl_settings, rxn_settings, configs)
    {
      date: Time.now.strftime('%d.%m.%Y'),
      author: "#{current_user.first_name} #{current_user.last_name}",
      spl_settings: spl_settings,
      rxn_settings: rxn_settings,
      configs: configs,
      objs: contents,
    }
  end

  def self.all_spl_settings
    {
      diagram: true,
      collection: true,
      analyses: true,
      reaction_description: true,
    }
  end

  def self.all_rxn_settings
    {
      diagram: true,
      material: true,
      description: true,
      purification: true,
      dangerous_products: true,
      tlc: true,
      observation: true,
      analysis: true,
      literature: true,
      variations: true,
    }
  end

  def self.all_configs
    {
      page_break: true,
      whole_diagram: true,
    }
  end

  def delete_archive
    full_file_path = File.join('public', 'docx', file_name + '.docx')
    FileUtils.rm(full_file_path, force: true) if File.exist?(full_file_path)
  end

  def delete_job
    job = Delayed::Job.find_by(queue: "report_#{id}")
    job&.delete
  end
end
