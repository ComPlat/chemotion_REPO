# frozen_string_literal: true

require 'uri'
require 'net/http'
require 'json'

module KetcherService
  # Use Ketcher-as-a-Service to render molfiles to SVG
  module RenderSvg
    def self.call_render_service(url, request)
      use_ssl = url.instance_of? URI::HTTPS
      Rails.logger.info("Sending molfile to render service at: #{url} (SSL: #{use_ssl})")
      start = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      res = Net::HTTP.start(url.host, url.port, read_timeout: 1.5, use_ssl: use_ssl) do |http|
        http.request(request)
      end
      finish = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      ketcher_logger.info("Render service response: #{res.code} in #{finish - start} seconds")
      raise Net::HTTPError.new("Server replied #{res.code}.", res) if res.code != '200'

      svg = JSON.parse(res.body)['svg']
      ketcher_logger.info('Render service replied with SVG.')
      svg
    rescue Errno::ECONNREFUSED
      self.log_exception('call_render_service.ECONNREFUSED(ketcher_service unreachable):', e, "url: #{url&.host}:#{url&.port}, res.code: #{res&.code}")
      raise
    rescue Errno::ENOENT
      self.log_exception('call_render_service.ENOENT(IOError):', e, "url: #{url&.host}:#{url&.port}, res.code: #{res&.code}")
      raise
    rescue Net::ReadTimeout
      self.log_exception('call_render_service.ReadTimeout:', e, "url: #{url&.host}:#{url&.port}, res.code: #{res&.code}")
      raise
    rescue Net::HTTPError
      self.log_exception('call_render_service.HTTPError:', e, "url: #{url&.host}:#{url&.port}, res.code: #{res&.code}")
      raise
    rescue JSON::ParserError => e
      self.log_exception('call_render_service.ParserError, Can nott parse reply:', e, "url: #{url&.host}:#{url&.port}, res.code: #{res&.code}")
      raise
    rescue StandardError  => e
      self.log_exception('call_render_service.StandardError:', e, "url: #{url&.host}:#{url&.port}, res.code: #{res&.code}")
      nil
    end

    def self.svg(molfile)
      url = URI(Rails.configuration.ketcher_service.url)
      request = Net::HTTP::Post.new(url.path, { 'Content-Type' => 'application/json' })
      request.body = { molfile: molfile.force_encoding('utf-8') }.to_json
      svg = RenderSvg.call_render_service(url, request)
      svg.force_encoding('utf-8')
    rescue StandardError  => e
      self.log_exception('svg.StandardError:', e, molfile)
      nil
    end
      
    def self.log_exception(name, exception, info = nil)
      self.ketcher_logger.error("[#{DateTime.now}] [#{name}] info: [#{info}] \n Exception: #{exception&.message}")   
      self.ketcher_logger.error(exception&.backtrace&.join("\n"))
    end

    def self.ketcher_logger
      @@ketcher_logger ||= Logger.new(File.join(Rails.root, 'log', 'ketcher.log'))
    end
  end
end
