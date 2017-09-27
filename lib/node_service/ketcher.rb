module NodeService
  # Serve ketcher as a service
  module Ketcher
    def self.svg_from_molfile(molfile)
      # return Chemotion::OpenBabelService.svg_from_molfile(molfile)
      zmq = ZeroMQ.instance
      svg = zmq.send_and_recv(molfile)

      return Chemotion::OpenBabelService.svg_from_molfile(molfile) if svg.empty?

      svg.force_encoding('UTF-8')
    end
  end
end
