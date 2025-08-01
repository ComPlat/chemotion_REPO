# frozen_string_literal: true

# Job to automatically upload publication data to NMRXiv when publication state changes to 'completed'
class NmrxivAutoUploadJob < ApplicationJob
  queue_as :nmrxiv_auto_upload

  def perform(publication_id)
    NmrxivAutoUploadService.new(publication_id).call
  end
end
