# frozen_string_literal: true

# Chemotion Repository-only Grape helpers layered over CollectionHelpers.
#
# Usage inside a Grape API class:
#   helpers CollectionHelpers
#   helpers RepoCollectionHelpers
#
# Only #set_var_for_unsigned_user lives here — it is a standalone hook used
# from `after_validation` blocks in repo-facing endpoints.
# #check_params_collection_id stays in CollectionHelpers because #set_var
# itself depends on it; pulling it out would force every CollectionHelpers
# consumer to also include this module.
module RepoCollectionHelpers
  # Seed @dl and force non-sync for unauthenticated repo visitors browsing
  # the Chemotion Repository public collections.
  def set_var_for_unsigned_user
    params[:is_sync] = false
    @dl = {
      permission_level: 0,
      sample_detail_level: 10,
      reaction_detail_level: 10,
      wellplate_detail_level: 0,
      screen_detail_level: 0,
      researchplan_detail_level: 0,
    }
  end
end
