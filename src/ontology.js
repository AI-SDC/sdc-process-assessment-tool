/* Loads the StatBarn SDC semantic model (RDF/XML) and derives the lookups the pages use. */
(() => {
  "use strict";

  const ONTOLOGY_URL = "https://ai-sdc.github.io/statbarnsdc/statbarnsdc.rdf";

  const NS = {
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    owl: "http://www.w3.org/2002/07/owl#",
    skos: "http://www.w3.org/2004/02/skos/core#",
  };
  const SB = "https://w3id.org/statbarnsdc#";
  const DPV_RISK = "https://w3id.org/dpv/owl#Risk";
  const DPV_RISK_EVALUATION = "https://w3id.org/dpv/risk/owl#RiskEvaluation";
  const HAS_RISK = "https://w3id.org/dpv/owl#hasRisk";
  const HAS_RISK_EVALUATION = "https://w3id.org/dpv/risk/owl#hasRiskEvaluation";
  const HAS_RISK_CRITERIA = "https://w3id.org/dpv/risk/owl#hasRiskCriteria";

  const shortName = (uri) => uri.replace(SB, "");

  const childText = (element, namespace, localName) =>
    element.getElementsByTagNameNS(namespace, localName)[0]?.textContent.trim() || "";

  // Reads each owl:Class (merging repeats): its definition, direct superclasses, and
  // "onProperty someValuesFrom" restrictions grouped by property.
  const readClasses = (doc) => {
    const classes = new Map();
    for (const element of doc.getElementsByTagNameNS(NS.owl, "Class")) {
      const uri = element.getAttributeNS(NS.rdf, "about");
      if (!uri || element.parentNode !== doc.documentElement) continue;
      // The RDF can describe one class in several elements, so merge them.
      const entry = classes.get(uri) || {
        uri,
        name: shortName(uri),
        definition: "",
        prefLabel: "",
        superclasses: [],
        restrictions: {},
      };
      entry.definition ||= childText(element, NS.skos, "definition");
      entry.prefLabel ||= childText(element, NS.skos, "prefLabel");
      for (const sub of element.children) {
        if (sub.namespaceURI !== NS.rdfs || sub.localName !== "subClassOf") continue;
        const direct = sub.getAttributeNS(NS.rdf, "resource");
        if (direct) {
          if (!entry.superclasses.includes(direct)) entry.superclasses.push(direct);
          continue;
        }
        const restriction = sub.getElementsByTagNameNS(NS.owl, "Restriction")[0];
        if (!restriction) continue;
        const property = restriction.getElementsByTagNameNS(NS.owl, "onProperty")[0]
          ?.getAttributeNS(NS.rdf, "resource");
        // Some links (e.g. ClassDisclosure -> PresenceOfZeroCheck) use allValuesFrom.
        const target = (
          restriction.getElementsByTagNameNS(NS.owl, "someValuesFrom")[0]
          || restriction.getElementsByTagNameNS(NS.owl, "allValuesFrom")[0]
        )?.getAttributeNS(NS.rdf, "resource");
        const targets = property && (entry.restrictions[property] ||= []);
        if (target && !targets.includes(target)) targets.push(target);
      }
      classes.set(uri, entry);
    }
    return classes;
  };

  const sortedObject = (entries) =>
    Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));

  const buildLookups = (classes) => {
    const all = [...classes.values()];
    const withSuper = (superUri) => all.filter((c) => c.superclasses.includes(superUri));
    const labelFor = (uri) => classes.get(uri)?.prefLabel || shortName(uri);

    const statbarns = {};
    for (const c of withSuper(`${SB}Statbarn`)) {
      statbarns[c.name] = {
        definition: c.definition,
        prefix_label: c.prefLabel,
        risks: (c.restrictions[HAS_RISK] || []).map(shortName),
        uri: c.uri,
      };
    }

    const analyses = {};
    for (const c of all) {
      const statbarn = c.superclasses.map(shortName).find((name) => statbarns[name]);
      if (statbarn) {
        analyses[c.name] = {
          definition: c.definition,
          name: c.name,
          prefix_label: c.prefLabel,
          statbarn,
          uri: c.uri,
        };
      }
    }

    const risks = {};
    for (const c of withSuper(DPV_RISK)) {
      risks[c.name] = {
        checks: (c.restrictions[HAS_RISK_EVALUATION] || []).map(shortName),
        definition: c.definition,
        prefix_label: c.prefLabel,
        uri: c.uri,
      };
    }

    const checks = {};
    for (const c of withSuper(DPV_RISK_EVALUATION)) {
      checks[c.name] = {
        criteria: (c.restrictions[HAS_RISK_CRITERIA] || []).map(labelFor),
        definition: c.definition,
        prefix_label: c.prefLabel,
        uri: c.uri,
      };
    }

    const sorted = (object) => sortedObject(Object.entries(object));
    return {
      analyses: sorted(analyses),
      statbarns: sorted(statbarns),
      risks: sorted(risks),
      checks: sorted(checks),
    };
  };

  const parseOntology = (text) => {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) {
      throw new Error("The semantic model is not valid RDF/XML.");
    }
    const lookups = buildLookups(readClasses(doc));
    if (!Object.keys(lookups.statbarns).length || !Object.keys(lookups.risks).length) {
      throw new Error("No statbarns or risks were found in the semantic model.");
    }
    return lookups;
  };

  const loadOntology = async (url = ONTOLOGY_URL) => {
    let response;
    try {
      response = await fetch(url, { cache: "no-cache" });
    } catch (networkError) {
      throw new Error(`Could not reach ${url}. Check your network connection.`);
    }
    if (!response.ok) {
      throw new Error(`Could not load ${url} (HTTP ${response.status}).`);
    }
    return parseOntology(await response.text());
  };

  window.SDCOntology = { ONTOLOGY_URL, loadOntology, parseOntology };
})();
