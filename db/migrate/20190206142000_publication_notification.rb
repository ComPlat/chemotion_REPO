class PublicationNotification < ActiveRecord::Migration
 def change
   channel = Channel.find_by(subject: Channel::PUBLICATION_REVIEW)
   channel.destroy if channel
   attributes = {
     subject: Channel::PUBLICATION_REVIEW,
     channel_type: 8,
     msg_template: '{"data": "%{subject}",
                     "action":"Repository_ReviewRequest",
                     "url": ""
                    }'
   }
   Channel.create(attributes)

   channel_r = Channel.find_by(subject: Channel::PUBLICATION_PUBLISHED)
   channel_r.destroy if channel_r
   attributes_r = {
     subject: Channel::PUBLICATION_PUBLISHED,
     channel_type: 8,
     msg_template: '{"data": "%{subject}",
                     "action":"Repository_Published"
                    }'
   }
   Channel.create(attributes_r)

 end
end
