"use strict";

const fs = require('fs');

const Sprite = require('./Sprite');
const Complexity = require('./Complexity');

const BIOMES = {
  0: 'grassland',
  1: 'swamp',
  2: 'prairie',
  3: 'rocky',
  4: 'snow'
}

class GameObject {
  constructor(dataText) {
    this.data = {};
    this.sprites = [];
    this.transitionsToward = [];
    this.transitionsAway = [];
    this.categories = [];
    this.parseData(dataText);
    this.complexity = new Complexity({});
    this.id = this.data.id;
  }

  parseData(dataText) {
    const lines = dataText.split('\n');
    for (var i = 0; i < lines.length; i++) {
      if (i == 1) {
        this.parseName(lines[i]);
      } else if (lines[i].includes('spriteID')) {
        this.parseSprite(lines.slice(i, i+7));
        i += 7;
      } else {
        this.parseLine(lines[i]);
      }
    }
  }

  parseName(name) {
    if (name) this.name = name.replace('#', ' - ');
  }

  parseLine(line) {
    for (var value of line.split(',')) {
      const parts = line.split('=');
      if (parts.length < 2) {
        // console.log("Skipping line: " + line);
      } else if (parts[0] == "mapChance") {
        this.parseMapChance(parts[1]);
      } else {
        this.data[parts[0]] = parts[1];
      }
    }
  }

  parseMapChance(value) {
    const parts = value.split('#');
    this.data.mapChance = parts[0];
    if (parts[1].includes("_")) {
      const ids = parts[1].split('_')[1].split(',');
      this.data.biomes = ids.map(id => BIOMES[id]);
    }
  }

  parseSprite(lines) {
    this.sprites.push(new Sprite(lines));
  }

  jsonData() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      foodValue: this.data.foodValue,
      heatValue: this.data.heatValue,
      clothing: this.data.clothing,
      insulation: this.insulationData(),
      numUses: this.data.numUses,
      complexity: this.complexity.value,
      techTree: this.techTreeNodes(3),
      transitionsToward: this.transitionsToward.map(t => t.jsonData()),
      transitionsAway: this.transitionsAway.map(t => t.jsonData()),
    };
  }

  hasSprite() {
    return this.sprites.length > 0;
  }

  sortWeight() { // TODO: Improve object sorting
    return -this.version*10000 + -this.complexity.value;
  }

  isTool() {
    for (var transition of this.transitionsAway) {
      if (transition.actor == this && transition.tool) return true;
    }
    return false;
  }

  isCraftableContainer() {
    return this.data.numSlots.split('#')[0] > 0 && !this.isGrave();
  }

  isGrave() {
    return this.name.includes("Grave");
  }

  isNatural() {
    return this.data.mapChance > 0;
  }

  isClothing() {
    return this.data.clothing != "n" && (this.data.rValue > 0 || this.data.foodValue == '0' && this.data.containable == '1');
  }

  isWaterSource() {
    // TODO: We need to fix water transitions to do this properly
    for (var transition of this.transitionsAway) {
      if (transition.actorID == '209' && transition.target == this && (transition.tool || transition.targetRemains)) return true;
    }
    return false;
  }

  techTreeNodes(depth) {
    const transition = this.transitionsToward[0];
    if (this.isNatural() || !transition)
      return null;
    if (depth == 0)
      return []; // Empty array means tree goes deeper
    var nodes = [];
    if (transition.decay)
      nodes.push({decay: transition.decay});
    if (transition.actor)
      nodes.push(transition.actor.techTreeNode(depth));
    if (transition.target)
      nodes.push(transition.target.techTreeNode(depth));
    return nodes;
  }

  techTreeNode(depth) {
    return {
      id: this.id,
      nodes: this.techTreeNodes(depth - 1)
    };
  }

  insulationData() {
    const parts = {'h': 0.25, 't': 0.35, 'b': 0.2, 's': 0.1, 'p': 0.1};
    if (parts[this.data.clothing])
      return parts[this.data.clothing]*parseFloat(this.data.rValue);
  }
}

module.exports = GameObject;
