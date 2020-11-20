#user = 'chemotion'
user = 'prod'

set :repo_url, 'git@git.scc.kit.edu:ComPlat/chemotion_REPO.git'
set :branch, 'server_chemotion_net'

#before 'deploy:migrate', 'deploy:backup'

server 'www.chemotion.net', user: user, roles: %w{app web db}

set :ssh_options, {
  forward_agent: false,
  auth_methods: %w(publickey)
}
#set :pty, false

set :linked_files, fetch(:linked_files, []).push(
  '.ruby-version',
  '.ruby-gemset',
  'config/spectra.yml',
  'config/node_service.yml'
)
set :linked_dirs, fetch(:linked_dirs, []).push(
  'public/newsroom',
  'public/howto',
  'public/ontologies'
)

#set :deploy_to, "/home/#{user}/www/chemotion"
set :deploy_to, "/var/www/chemotion_REPO"
#set :tmp_dir, "/home/#{user}/tmp"
set :user, user

#set :bundle_without, %w{}.join(' ')
set :bundle_flags, '--frozen --deployment ' #--quiet

set :slackistrano, {
  klass: Slackistrano::SlackistranoCustomMessaging,
  channel: '#cap_deploy',
  webhook: 'https://hooks.slack.com/services/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'
}
set :log_file, 'log/cap-server_complat-eln.log'
set :slack_members, ['pi_r', 'nicole']

set :git_current_rev, ->{ `git rev-list --max-count=1 #{fetch(:branch, 'development')}`&.strip }
set :git_base_rev, ->{ `git merge-base development #{fetch(:branch, 'development')}`&.strip }
set :git_url, ->{ "https://git.scc.kit.edu/ComPlat/chemotion_REPO/network/#{fetch(:git_base_rev, 'development')}" }
set :git_log_message, ->{ `git log -1   #{fetch(:git_base_rev, 'development')}` }
