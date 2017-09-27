class MigrateDois < ActiveRecord::Migration
  def change
    begin
    file = File.open("log/doi_seeding.log", "w")
    file.write('==================')
    file.write(Time.now)
    Collection.public_collection.samples.order(id: :asc).each do |s|
      message = "sample(#{s.id}) "
      t = s.tag.taggable_data['publication']
      unless t
        ActiveRecord::Base.logger.error(message + 'no publication tag')
        file.write(message + 'no publication tag' + "\n")
        next
      end

      td = t['doi']
      sd = Doi.send(:split_doi, td)
      if (ed = Doi.find_by(suffix: sd[:suffix]))
        el = ed.doiable
        if el && el != s
          message_2 = message + "doi(#{sd[:suffix]}) attributed to another element #{el.class.name} #{el.id}"
          ActiveRecord::Base.logger.error message_2
          file.write message_2 + "\n"
        else
          ed.update(doiable: s)
        end
      else
        Doi.create(suffix: sd[:suffix], doiable: s)
      end
    end

    Collection.public_collection.samples.find_each do |s|
      mess = "sample(#{s.id}) "
      s.analyses.each do |a|
        message = mess + "analysis(#{a.id}) "
        t = a.tag && a.tag.taggable_data && a.tag.taggable_data['publication']
        unless t
          ActiveRecord::Base.logger.error(message + 'no publication tag')
          file.write message + 'no publication tag' + "\n"
          next
        end
        td = t['analysis_doi']
        unless td
          ActiveRecord::Base.logger.error(message + 'no analysis doi')
          file.write message + 'no analysis doi' + "\n"
          next
        end
        sd = Doi.send(:split_doi, td)
        if (ed = Doi.find_by(suffix: sd[:suffix]))
          el = ed.doiable
          if el && el != a
            re = el.root_element
            message2 = message + "doi(#{sd[:suffix]}) attributed to another element #{re.class.name}(#{re.id}) #{el.class.name}(#{el.id})"
            ActiveRecord::Base.logger.error message2
            file.write message2 + "\n"
          else
            ed.update(doiable: a)
          end
        else
          Doi.create(suffix: sd[:suffix], doiable: a)
        end
      end
    end
    ensure
      file.close unless file.nil?
    end
  end
end
