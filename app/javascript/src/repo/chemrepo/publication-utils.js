import UIStore from 'src/stores/alt/stores/UIStore';
import getFormattedRange from 'src/repo/chemrepo/range-utils';

export const getElementType = (element) => element?.tag?.taggable_type;

export const getPublicationId = (element) => {
  const tag = element?.tag || {};
  const tagData = tag.taggable_data || {};
  const tagType = getElementType(element) || '';
  const publishedId = tagData[`public_${tagType.toLowerCase()}`];
  return publishedId;
};

export const getPublication = (element) => {
  const tag = element?.tag || {};
  const tagData = tag.taggable_data || {};
  return tagData.publication;
};

export const getTagDataByTag = (element, tagName = 'previous_version') => {
  const tag = element?.tag || {};
  const tagData = tag.taggable_data || {};
  return tagData[tagName];
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

export const doStValidation = element => {
  const { x: submitException } = UIStore.getState();
  if (!submitException) return true;
  const elementExceptions = submitException[element.type] || [];
  if (
    elementExceptions.length < 1 ||
    (submitException?.rules?.length || 0) < 1
  ) {
    return true;
  }
  if (element.segments?.length < 1) {
    return true;
  }

  if (!Array.isArray(elementExceptions)) {
    return true;
  }

  const exceptions = elementExceptions.some(exception => {
    const rule = submitException.rules.find(
      r => r.id === exception.rule
    );
    if (!rule) {
      return true;
    }

    const checkSegment = element.segments.find(
      segment =>
        segment.klass_label === exception.segment &&
        segment.element_type.toLowerCase() === element.type
    );
    if (!checkSegment) {
      return false;
    }

    // required check
    const requiredLayers = rule.properties.required.layers;
    const checkRequired = requiredLayers.some(layer => {
      const checkLayer = checkSegment.properties.layers[layer.key];
      if (!checkLayer) {
        return false;
      }

      // check fields of the layer
      const requiredFields = layer.fields;
      const result = checkLayer.fields.filter(
        rec => requiredFields.includes(rec.field) && !!rec.value
      );
      return result.length !== requiredFields.length;
    });
    return checkRequired;
  });

  return exceptions;
};

export const hasVersion = (element) =>
  Boolean(getTagDataByTag(element, 'previous_version'));

export const getDoiVer = (doi) => {
  if (!doi) return '';
  const value = (doi || '').match(/\/V(\d+)/i);
  return value ? value[1] : '';
};
