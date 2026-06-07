const { PROFILE_FIELD_DEFINITIONS } = require('../../shared/profileSchema.cjs');
const {
  fieldText,
  fieldValue,
  normalizeText,
  toEvidenceField,
} = require('./profileFieldService.cjs');

function readArrayItems(profile, key) {
  const raw = fieldValue(profile?.[key]);
  if (Array.isArray(raw)) {
    return raw.map((item) => normalizeText(item)).filter(Boolean);
  }
  const text = normalizeText(raw);
  return text ? [text] : [];
}

function readScalarText(profile, key) {
  return normalizeText(fieldValue(profile?.[key]));
}

function mergeArrayItems(existingItems, draftItems) {
  const seen = new Set(existingItems.map((item) => normalizeText(item)));
  const addedItems = [];
  draftItems.forEach((item) => {
    const norm = normalizeText(item);
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    addedItems.push(item);
  });
  return { addedItems, mergedItems: [...existingItems, ...addedItems] };
}

function pickSourceQuote(field) {
  if (field && typeof field === 'object' && !Array.isArray(field) && Object.prototype.hasOwnProperty.call(field, 'source_quote')) {
    return field.source_quote || null;
  }
  return null;
}

function pickConfidence(field) {
  if (field && typeof field === 'object' && !Array.isArray(field) && Object.prototype.hasOwnProperty.call(field, 'confidence')) {
    const number = Number(field.confidence);
    return Number.isFinite(number) ? number : undefined;
  }
  return undefined;
}

function diffProfiles(existingProfile = {}, draftProfile = {}) {
  const additions = [];
  const conflicts = [];
  const arrayMerges = [];
  const unchanged = [];

  PROFILE_FIELD_DEFINITIONS.forEach((definition) => {
    const { key, label, group, isArray } = definition;
    const draftRaw = draftProfile?.[key];
    const draftFieldText = fieldText(draftProfile, key);

    if (isArray) {
      const draftItems = readArrayItems(draftProfile, key);
      const existingItems = readArrayItems(existingProfile, key);

      if (draftItems.length === 0) {
        if (existingItems.length > 0) unchanged.push(key);
        return;
      }

      if (existingItems.length === 0) {
        additions.push({
          key,
          label,
          group,
          isArray: true,
          existingValue: [],
          newValue: draftItems,
          sourceQuote: pickSourceQuote(draftRaw),
          confidence: pickConfidence(draftRaw),
        });
        return;
      }

      const { addedItems, mergedItems } = mergeArrayItems(existingItems, draftItems);
      if (addedItems.length === 0) {
        unchanged.push(key);
        return;
      }
      arrayMerges.push({
        key,
        label,
        existingItems,
        addedItems,
        mergedItems,
        sourceQuote: pickSourceQuote(draftRaw),
        confidence: pickConfidence(draftRaw),
      });
      return;
    }

    if (!draftFieldText) {
      if (readScalarText(existingProfile, key)) unchanged.push(key);
      return;
    }

    const existingText = readScalarText(existingProfile, key);
    if (!existingText) {
      additions.push({
        key,
        label,
        group,
        isArray: false,
        existingValue: null,
        newValue: draftFieldText,
        sourceQuote: pickSourceQuote(draftRaw),
        confidence: pickConfidence(draftRaw),
      });
      return;
    }

    if (normalizeText(existingText) === normalizeText(draftFieldText)) {
      unchanged.push(key);
      return;
    }

    conflicts.push({
      key,
      label,
      group,
      isArray: false,
      existingValue: existingText,
      newValue: draftFieldText,
      sourceQuote: pickSourceQuote(draftRaw),
      confidence: pickConfidence(draftRaw),
    });
  });

  return { additions, conflicts, arrayMerges, unchanged };
}

function evidenceFromDraft(profile, key, fallbackValue) {
  const raw = profile?.[key];
  const sourceQuote = pickSourceQuote(raw);
  const confidence = pickConfidence(raw);
  return toEvidenceField({
    value: fallbackValue,
    source_quote: sourceQuote,
    confidence: confidence ?? 0.8,
  });
}

function applyDiffDecisions(existingProfile = {}, draftProfile = {}, decisions = {}) {
  const conflictDecisions = decisions?.conflicts || {};
  const additionDecisions = decisions?.additions || {};
  const arrayDecisions = decisions?.arrayMerges || {};
  const merged = {};

  PROFILE_FIELD_DEFINITIONS.forEach((definition) => {
    const { key, isArray } = definition;
    const existingRaw = existingProfile?.[key];
    const draftRaw = draftProfile?.[key];

    if (isArray) {
      const existingItems = readArrayItems(existingProfile, key);
      const draftItems = readArrayItems(draftProfile, key);

      if (draftItems.length === 0) {
        if (existingRaw !== undefined && existingRaw !== null) merged[key] = existingRaw;
        return;
      }

      if (existingItems.length === 0) {
        if (additionDecisions[key] === 'skip') {
          if (existingRaw !== undefined && existingRaw !== null) merged[key] = existingRaw;
          return;
        }
        merged[key] = evidenceFromDraft(draftProfile, key, draftItems);
        return;
      }

      const { mergedItems } = mergeArrayItems(existingItems, draftItems);
      if (arrayDecisions[key] === 'skip') {
        merged[key] = existingRaw !== undefined && existingRaw !== null ? existingRaw : evidenceFromDraft(existingProfile, key, existingItems);
        return;
      }
      merged[key] = evidenceFromDraft(draftProfile, key, mergedItems);
      return;
    }

    const draftText = fieldText(draftProfile, key);
    if (!draftText) {
      if (existingRaw !== undefined && existingRaw !== null) merged[key] = existingRaw;
      return;
    }

    const existingText = readScalarText(existingProfile, key);
    if (!existingText) {
      if (additionDecisions[key] === 'skip') return;
      merged[key] = evidenceFromDraft(draftProfile, key, draftText);
      return;
    }

    if (normalizeText(existingText) === normalizeText(draftText)) {
      if (existingRaw !== undefined && existingRaw !== null) merged[key] = existingRaw;
      return;
    }

    const decision = conflictDecisions[key];
    if (decision === 'overwrite') {
      merged[key] = evidenceFromDraft(draftProfile, key, draftText);
    } else if (existingRaw !== undefined && existingRaw !== null) {
      merged[key] = existingRaw;
    }
  });

  ['id', 'project_id', 'generated_long_tail_keywords'].forEach((key) => {
    if (existingProfile?.[key]) merged[key] = existingProfile[key];
    else if (draftProfile?.[key]) merged[key] = draftProfile[key];
  });

  return merged;
}

module.exports = {
  diffProfiles,
  applyDiffDecisions,
};
