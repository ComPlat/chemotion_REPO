# frozen_string_literal: true

namespace :repository do
  desc <<~DESC
    Export published samples as a single SDF file
    (intended for ChemSpider integration).
    Args:
      from   = ISO-8601 lower bound on publications.published_at (optional)
      to     = ISO-8601 upper bound on publications.published_at (optional)
      out    = output file path (default: tmp/chemotion-<timestamp>.sdf)
      fields = comma-separated list of optional SDF tags (default: all);
               escape inner commas in zsh/bash: 'INCHI\\,CANONICAL_SMILES'
    Examples:
      # All published samples; output goes to tmp/chemotion-<timestamp>.sdf
      bundle exec rake repository:export_sdf

      # Date range and explicit output path
      bundle exec rake 'repository:export_sdf[2025-01-01,2026-01-01,tmp/chemspider.sdf]'

      # Last 3 months (leave `to` empty for "now")
      bundle exec rake "repository:export_sdf[$(date -d '3 months ago' -Iseconds),,tmp/last_3m.sdf]"

      # Restricted to specific optional tags
      bundle exec rake 'repository:export_sdf[,,tmp/limited.sdf,INCHI\\,CANONICAL_SMILES]'
  DESC
  task :export_sdf, %i[from to out fields] => :environment do |_t, args|
    from = args[:from].presence
    to = args[:to].presence
    default_out = Rails.root.join('tmp',
                                  "chemotion-#{Time.now.utc.strftime('%Y%m%d-%H%M%S')}.sdf").to_s
    out_path = args[:out].presence || default_out
    fields = args[:fields].presence

    FileUtils.mkdir_p(File.dirname(out_path))

    service = RepoSdfExportService.new(from: from, to: to, fields: fields)

    record_count = 0
    File.open(out_path, 'w') do |f|
      service.each_record do |entry|
        f.write(entry)
        record_count += 1
      end
    end

    puts "Wrote #{record_count} record(s) to #{out_path}"
  end
end
