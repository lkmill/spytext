/**
 * Snapback is a DOM undo and redo library. It uses
 * a MutationObserver to observe changes to a DOM Element's sub tree.
 * When at least one mutation has been stored in the mutations array,
 * these mutations can be grouped together and saved as an undo.
 * Snapback can then be used to traverse back and forth in the undo history.
 *
 * @module spytext/snapback 
 */

/**
 * An Undo item contains several MutationRecords (records of changes to the DOM in chronological order)
 * and the positions of the selection caret's before and after the mutations.
 *
 * @typedef {Object} Undo
 * @property {Object} positions - Reference node to count `offset` from
 * @property {Positions} positions.before - The position of the selection before the first mutation
 * @property {Positions} positions.after - The position of the selection after the last mutation in the undo
 * @property {MutationRecord[]} positions.mutations - An array of all the mutations for the undo. All mutations
 * are stored in chronological order, so if you want to UNDO them, you need to reverse the mutation array first.
 */

var selectron = require('./selectron');

/**
 * Creates a new Snapback instance that will handle undo's and redo's for `element`s DOM sub tree
 *
 * @class
 * @constructor
 * @alias module:spytext/snapback
 * @param {Element} element - The element who's subTree we want to observe for changes
 **/
var Snapback = function(element) {
	// determine which version of MutationObserver to use
	var MO = typeof MutationObserver !== 'undefined' ? MutationObserver : (typeof WebKitMutationObserver !== 'undefined' ? WebKitMutationObserver : undefined);

	// stop everything if no MutationObserver is found
	if(!MO) return;

	var _snapback = this;

	// bind `this` to the instance snapback instance inside addMutation,
	// see line 57
	_.bindAll(_snapback, 'addMutation');

	// extend the current instance of snapback with some properties
	_.extend(_snapback, {
		// this is the config pass to the observe function on the Mutation Observer
		config: { subtree: true, attributeFilter: [ 'style' ], attributes: true, attributeOldValue: true, childList: true, characterData: true, characterDataOldValue: true },
		element: element,
		// the undo stack is a collection of Undo objects
		undos: [],
		// the mutations stack holds all mutations that have not yet been registered in an undo
		mutations: [],
		// pointer to where in the undo history we are
		undoIndex: -1,
	});

	// instantiate a MutationObserver (this will be started and stopped in this.enable and this.disable respectively
	_snapback.observer = new MO(function(mutations) {
		mutations.forEach(_snapback.addMutation);    
	});
};

Snapback.prototype = {
	/**
	 * Adds a mutation to the mutation array
	 *
	 * @param	{MutationRecord} mutation - The mutation to the mutations array
	 */
	addMutation: function(mutation) {
		switch(mutation.type) {
			case 'characterData': 
				// save the new value of the textNode
				mutation.newValue = mutation.target.textContent;

				var lastMutation = _.last(this.mutations);

				if(lastMutation && lastMutation.type === 'characterData' && lastMutation.target === mutation.target && lastMutation.newValue === mutation.oldValue) {
					// current and last mutations were characterData mutations on the same textNode.
					// simply set newValue of lastMutation to newValue of current
					lastMutation.newValue = mutation.newValue;
					return;
				} 
				break;
			case 'attributes':
				// save new value of the updated attribute
				mutation.newValue = mutation.target.getAttribute(mutation.attributeName);
				break;
		}

		// add a new mutation to the stack
		this.mutations.push(mutation);
	},

	/**
	 * Stop observering mutations to the DOM. This does not register
	 * any mutations in the mutation stack. Essentially
	 * this just callc MutationObserver.disconnect().
	 */
	disable: function() {
		if(this.enabled) {
			this.observer.disconnect();
			this.enabled = false;
		}
	},

	/**
	 * Enable observering mutations to the DOM. Essentially
	 * just calls MutationObserver.observe().
	 */
	enable: function() {
		if(!this.enabled) {
			this.observer.observe(this.element, this.config);
			this.enabled = true;
		}
	},

	/**
	 * Saves and returns the positions of the current selection
	 *
	 * @return {Positions}
	 */
	storePositions: function(position) {
		return (this.position = (position || selectron.get()));
	},

	/**
	 * Registers any mutations in the mutation stack as an undo
	 */
	register: function() {
		if(this.mutations.length > 0) {
			// only register a new undo if there are mutations in the stack
			if(this.undoIndex < this.undos.length - 1) {
				// remove any undos after undoIndex, ie the user
				// has undo'd and a new undo branch/tree is needed
				this.undos = this.undos.slice(0, this.undoIndex + 1);
			}

			if(_.last(this.mutations).type === 'characterData') {
				selectron.update(true, false, false);
			}

			// push a new Undo object to the undo stack
			this.undos.push({
				positions: {
					before: this.position,
					after: this.storePositions()
				},
				mutations: this.mutations
			});

			// reset the mutations stack
			this.mutations = [];

			// update the undoIndex
			this.undoIndex = this.undos.length - 1;
		}
	},

	/**
	 * Redo (if we are not already at the newest change)
	 */
	redo: function() {
		if(this.enabled && this.undoIndex < this.undos.length - 1) {
			this.undoRedo(this.undos[++this.undoIndex], false);
		}
	},

	/**
	 * Undo (if we are not already at the oldest change)
	 */
	undo: function() {
		this.register();

		if(this.enabled && this.undoIndex >= 0) {
			this.undoRedo(this.undos[this.undoIndex--], true);
		}
	},

	/**
	 * This is the function that actually performs the mutations in Undo items and
	 * then restores appropriate selection. It uses the undoIndex property to
	 * determine which Undo to redo or undo.
	 *
	 * @param {Object} undo
	 * @param {boolean} [isUndo] - Determines whether we should do or undo `undo`.
	 */
	undoRedo: function(undo, isUndo) {
		this.disable();

		// reverse the mutation collection if we are doing undone (we want to execute the mutations
		// in the opposite order to undo them
		var mutations = isUndo ? undo.mutations.slice(0).reverse() : undo.mutations,
			// use `isUndo` to determine whether we should use selection before or after mutations
			position = isUndo ? undo.positions.before : undo.positions.after;

		mutations.forEach(function(mutation) {
			switch(mutation.type) {
				case 'characterData':
					// update the textContent 
					mutation.target.textContent = isUndo ? mutation.oldValue : mutation.newValue;
					break;
				case 'attributes':
					// update the attribute 
					$(mutation.target).attr(mutation.attributeName, isUndo ? mutation.oldValue : mutation.newValue);
					break;
				case 'childList':
					// set up correctly what nodes to be added and removed
					var addNodes = isUndo ? mutation.removedNodes : mutation.addedNodes,
						removeNodes = isUndo ? mutation.addedNodes : mutation.removedNodes;

					_.toArray(addNodes).forEach(function(node) {
						if (mutation.nextSibling) {
							$(mutation.nextSibling).before(node);
						} else {
							$(mutation.target).append(node);
						}
					});

					// remove all nodes to be removed
					$(removeNodes).remove();
					break;
			}
		});

		this.storePositions(position);
		selectron.restore(position, true);

		// reenable
		this.enable();
	}
};

module.exports = Snapback;
