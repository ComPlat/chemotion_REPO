import UIStore from 'src/stores/alt/stores/UIStore';
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

export const doStValidation = element => {
  const { x: submitException } = UIStore.getState();
  const elementExceptions = submitException[element.type] || [];
  if (
    elementExceptions.length < 1 ||
    (submitException?.rules.length || 0) < 1
  ) {
    // console.log('no exception or no rule, do the validation');
    return true;
  }
  if (element.segments?.length < 1) {
    // console.log('element has no segments, do the validation');
    return true;
  }

  if (!Array.isArray(elementExceptions)) {
    // console.log('elementExceptions is not array, do the validation');
    return true;
  }

  const exceptions = elementExceptions.some(exception => {
    const rule = submitException.rules.find(
      r => r.id === exception.rule // && r.segment === exception.segment
    );
    if (!rule) {
      // console.log('exception has no match rule, stop and do the validation');
      return true;
    }

    const checkSegment = element.segments.find(
      segment =>
        segment.klass_label === exception.segment &&
        segment.element_type.toLowerCase() === element.type
    );
    if (!checkSegment) {
      // console.log('element has no match segment, continue to find the next segment rule');
      return false;
    }

    // required check
    const requiredLayers = rule.properties.required.layers;
    const checkRequired = requiredLayers.some(layer => {
      const checkLayer = checkSegment.properties.layers[layer.key];
      if (!checkLayer) {
        // console.log('no match layer, continue to find the next layer rule');
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
