# frozen_string_literal: true

# Helpers to skip specs that depend on external binaries not guaranteed to be
# present in every CI image (e.g. the CI runner may ship without ImageMagick's
# `convert` or Inkscape). Specs call these in a `before` block so the example
# is marked pending with a clear reason instead of erroring.
module BinaryAvailability
  module_function

  def binary_available?(name)
    cached = (@binary_cache ||= {})
    return cached[name] if cached.key?(name)

    cached[name] = system("command -v #{name} > /dev/null 2>&1")
  end
end

RSpec.configure do |config|
  config.include(Module.new do
    def skip_unless_binary_available(name)
      return if BinaryAvailability.binary_available?(name)

      skip "#{name} binary not available in this environment"
    end
  end)
end
