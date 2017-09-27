namespace :data do
  desc 'Manual reject publication to retracted collection'
  task :ver_20190225105803_manual_reject_publication, [:new_element_id, :new_element_type] do |t, args|
    proc_reject_analyses = Proc.new do |parent|
      return if parent.nil?
      parent&.analyses&.each do |a|
        atag = a&.tag&.taggable_data&.delete("public_analysis")
        a.tag.save! unless atag.nil?
      end
    end

    publication = Publication.find_by(element_id: args[:new_element_id], element_type: args[:new_element_type], ancestry: nil, state: 'pending')

    ot = publication.original_element&.tag&.taggable_data&.delete("public_#{publication.element_type.downcase}")
    publication.original_element.tag.save! unless ot.nil?
    pp = publication.original_element&.tag&.taggable_data&.delete("publish_pending")
    publication.original_element.tag.save! unless pp.nil?

    proc_reject_analyses.call(publication.original_element)

    if publication.element_type == 'Reaction'
      publication.original_element&.samples.each do |s|
        t = s.tag&.taggable_data&.delete('public_sample')
        s.tag.save! unless t.nil?
        spp = s.tag&.taggable_data&.delete('publish_pending')
        s.tag.save! unless spp.nil?

        proc_reject_analyses.call(s)
      end
    end

    publications = [publication] + publication.descendants
    publications.each { |d| d.update_columns(state: 'retracted') }

    case publication.element_type
    when 'Reaction'
      publication.element.collections&.each do |c|
        CollectionsReaction.move_to_collection(publication.element.id, c.id ,1179)
      end
    when 'Sample'
      publication.element.collections&.each do |c|
        CollectionsSample.move_to_collection(publication.element.id, c.id ,1179)
      end
    end
  end
end
