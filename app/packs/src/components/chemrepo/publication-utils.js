import getFormattedRange from 'src/components/chemrepo/range-utils';

export const getElementType = element => element?.tag?.taggable_type;

export const getPublicationId = (element) => {
  const tag = element?.tag || {};
  const tagData = tag.taggable_data || {};
  const tagType = getElementType(element) || '';
  const publishedId = tagData[`public_${tagType.toLowerCase()}`];
  return publishedId;
};

export const getAuthorLabel = (authorIds) => {
  if (!authorIds) return '';
  return authorIds.length > 1 ? 'Authors:' : 'Author:';
};

export const formatPhysicalProps = (element) => {
  const meltingPoint = getFormattedRange(element.melting_point);
  const boilingPoint = getFormattedRange(element.boiling_point);
  const showPhysicalProps = (!!meltingPoint || !!boilingPoint);
  return { meltingPoint, boilingPoint, showPhysicalProps };
};
