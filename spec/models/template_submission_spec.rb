# frozen_string_literal: true

# == Schema Information
#
# Table name: template_submissions
#
#  id                                                                                     :bigint           not null, primary key
#  deleted_at(The deletion time of the submission)                                        :datetime
#  metadata(Additional metadata about the klass info and submission)                      :jsonb            not null
#  origin(The origin of the submission)                                                   :string           not null
#  state(The state of the submission (0: pending, 1: approved, 2: rejected, 3: released)) :integer          default("pending"), not null
#  template(The template data submitted)                                                  :jsonb            not null
#  template_klass(The type of template submitted)                                         :string           not null
#  created_at(The creation time of the submission)                                        :datetime         not null
#  updated_at(The last update time of the submission)                                     :datetime
#
# Indexes
#
#  idx_template_submissions_metadata  (metadata) USING gin
#  idx_template_submissions_template  (template) USING gin
#
require 'rails_helper'

RSpec.describe TemplateSubmission, type: :model do
  describe 'validations' do
    it { is_expected.to validate_presence_of(:template_klass) }
    it { is_expected.to validate_presence_of(:template) }
    it { is_expected.to validate_presence_of(:metadata) }
    it { is_expected.to validate_presence_of(:origin) }
    it { is_expected.to validate_presence_of(:state) }
  end

  describe 'enums' do
    subject(:template_submission) { described_class.new }

    it do
      expect(template_submission).to define_enum_for(:state)
        .with_values(pending: 0, approved: 1, rejected: 2, released: 3)
    end
  end

  describe 'scopes' do
    let!(:reaction_submission) do
      described_class.create!(
        template_klass: 'reaction',
        template: { name: 'Reaction' },
        metadata: { source: 'test' },
        origin: 'api',
        state: :pending,
      )
    end

    let!(:sample_submission) do
      described_class.create!(
        template_klass: 'sample',
        template: { name: 'Sample' },
        metadata: { source: 'test' },
        origin: 'external',
        state: :approved,
      )
    end

    let!(:deleted_submission) do
      submission = described_class.create!(
        template_klass: 'analysis',
        template: { name: 'Analysis' },
        metadata: { source: 'test' },
        origin: 'api',
        state: :pending,
      )
      submission.destroy
      submission
    end

    describe '.by_template_klass' do
      it 'filters by template klass' do
        expect(described_class.by_template_klass('reaction')).to eq([reaction_submission])
      end
    end

    describe '.by_state' do
      it 'filters by state' do
        expect(described_class.by_state(:approved)).to eq([sample_submission])
      end
    end

    describe '.by_origin' do
      it 'filters by origin' do
        expect(described_class.by_origin('external')).to eq([sample_submission])
      end
    end

    describe 'default scope (acts_as_paranoid)' do
      it 'excludes soft-deleted submissions' do
        expect(described_class.all).to contain_exactly(reaction_submission, sample_submission)
      end

      it 'includes soft-deleted submissions when using with_deleted' do
        expect(described_class.with_deleted).to include(deleted_submission)
      end
    end

    describe '.recent' do
      it 'orders by created_at desc' do
        expect(described_class.recent.first).to eq(sample_submission)
      end
    end
  end

  describe 'soft delete via acts_as_paranoid' do
    let(:submission) do
      described_class.create!(
        template_klass: 'reaction',
        template: { name: 'Test' },
        metadata: { source: 'test' },
        origin: 'api',
        state: :pending,
      )
    end

    it 'sets deleted_at timestamp when destroyed' do
      expect { submission.destroy }.to change(submission, :deleted_at).from(nil)
    end

    it 'does not really destroy the record' do
      submission.destroy
      expect(described_class.with_deleted.find_by(id: submission.id)).not_to be_nil
    end
  end

  describe 'state transitions' do
    let(:submission) do
      described_class.create!(
        template_klass: 'reaction',
        template: { name: 'Test' },
        metadata: { source: 'test' },
        origin: 'api',
        state: :pending,
      )
    end

    it 'can transition from pending to approved' do
      submission.update!(state: :approved)
      expect(submission.state).to eq('approved')
    end

    it 'can transition from pending to rejected' do
      submission.update!(state: :rejected)
      expect(submission.state).to eq('rejected')
    end

    it 'can transition from approved to released' do
      submission.update!(state: :approved)
      submission.update!(state: :released)
      expect(submission.state).to eq('released')
    end
  end

  describe 'jsonb columns' do
    it 'stores template as JSON' do
      submission = described_class.create!(
        template_klass: 'reaction',
        template: { name: 'Test', steps: %w[step1 step2] },
        metadata: { source: 'test' },
        origin: 'api',
        state: :pending,
      )

      expect(submission.template['name']).to eq('Test')
      expect(submission.template['steps']).to eq(%w[step1 step2])
    end

    it 'stores metadata as JSON' do
      submission = described_class.create!(
        template_klass: 'reaction',
        template: { name: 'Test' },
        metadata: { source: 'external', version: '1.0' },
        origin: 'api',
        state: :pending,
      )

      expect(submission.metadata['source']).to eq('external')
      expect(submission.metadata['version']).to eq('1.0')
    end
  end
end
