namespace :email_confirmation do
  task yearly: :environment do
    Person.where("confirmed_at < ?", Time.now - 1.year ).each do |person|
      person.update!(confirmed_at: nil, unconfirmed_email: person.email)
      person.send_confirmation_instructions
    end
  end
end
