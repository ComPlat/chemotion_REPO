# frozen_string_literal: true

# Logger configuration for NMRXIV and Tracker services
# This ensures loggers work properly in both sync and async (perform_later) contexts
module LoggerConfig
  class << self
    def nmrxiv_logger
      @nmrxiv_logger ||= create_logger('nmrxiv.log', 'NMRXIV')
    end

    def tracker_logger
      @tracker_logger ||= create_logger('tracker.log', 'TRACKER')
    end

    private

    def create_logger(filename, progname = nil)
      log_path = Rails.root.join('log', filename)
      logger = Logger.new(log_path, 'daily')
      logger.progname = progname if progname
      logger.level = Rails.env.production? ? Logger::INFO : Logger::DEBUG

      # Ensure the logger flushes immediately for background jobs
      logger.formatter = proc do |severity, datetime, progname_local, msg|
        "[#{datetime.in_time_zone('Europe/Berlin').strftime('%Y-%m-%d %H:%M:%S %Z')}] #{severity} -- #{progname_local}: #{msg}\n"

      end

      # For background jobs, ensure immediate flushing
      if defined?(Delayed::Job)
        original_write = logger.instance_variable_get(:@logdev).instance_variable_get(:@dev).method(:write)
        logger.instance_variable_get(:@logdev).instance_variable_get(:@dev).define_singleton_method(:write) do |message|
          result = original_write.call(message)
          flush if respond_to?(:flush)
          result
        end
      end

      logger
    end
  end
end
