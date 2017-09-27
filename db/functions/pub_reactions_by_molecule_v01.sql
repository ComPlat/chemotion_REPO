CREATE OR REPLACE FUNCTION pub_reactions_by_molecule(collection_id integer, molecule_id integer)
  RETURNS TABLE(reaction_ids integer)
  LANGUAGE sql
  AS $$
    (select r.id from collections c, collections_reactions cr, reactions r, reactions_samples rs, samples s,molecules m
     where c.id=$1 and c.id = cr.collection_id and cr.reaction_id = r.id
     and r.id = rs.reaction_id and rs.sample_id = s.id and rs.type in ('ReactionsProductSample')
     and c.deleted_at is null and cr.deleted_at is null and r.deleted_at is null and rs.deleted_at is null and s.deleted_at is null and m.deleted_at is null
     and s.molecule_id = m.id and m.id=$2)
  $$
