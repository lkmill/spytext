var selectron = require('./selectron');

var Snapback = function(element, config) {
	var MO = typeof MutationObserver !== 'undefined' ? MutationObserver : (typeof WebKitMutationObserver !== 'undefined' ? WebKitMutationObserver : undefined);

	if(!MO) return;

	var that = this;

	this.config = { subtree: true, attributeFilter: [ 'style' ], attributes: true, attributeOldValue: true, childList: true, characterData: true, characterDataOldValue: true };
	this.element = element;
	this.undos = [];
	this.mutations = [];
	this.undoIndex = -1;
	this.enabled = false;
	this.positron = this.getPositron();

	this.observer = new MO(function(mutations) {
		mutations.forEach(function(mutation) {
			switch(mutation.type) {
				case 'childList':
				case 'attributes':
				case 'characterData':
					that.addMutation(mutation);
					break;
			}
		});    
	});
};

Snapback.prototype = {
	addMutation: function(mutation) {
		switch(mutation.type) {
			case 'characterData': 
				mutation.newValue = mutation.target.textContent;
				var lastIndex = this.mutations.length - 1;
				if(lastIndex > -1 && this.mutations[lastIndex].type === 'characterData' && this.mutations[lastIndex].target === mutation.target && this.mutations[lastIndex].newValue === mutation.oldValue) {
					this.mutations[lastIndex].newValue = mutation.newValue;
				} else {
					this.mutations.push(mutation);
				}
				break;
			case 'attributes':
				mutation.newValue = mutation.target.getAttribute(mutation.attributeName);
				this.mutations.push(mutation);
				break;
			case 'childList':
				this.mutations.push(mutation);
				break;
		}
	},

	redo: function() {
		if(this.enabled && this.undoIndex < this.undos.length - 1) {
			this.undoIndex++;
			this.undoRedo(this.undos[this.undoIndex], false);
		}
	},

	register: function() {
		if(!this.element) return;
		if(this.enabled && this.mutations.length > 0) {
			if(this.undoIndex < this.undos.length - 1) {
				this.undos = this.undos.slice(0, this.undoIndex + 1);
			}
			var positrons = {};
			positrons.before = this.positron;
			positrons.after = this.getPositron();

			this.undos.push({ positrons: positrons, mutations: this.mutations });
			this.mutations = [];
			this.undoIndex = this.undos.length -1;
		}

		this.setPositron();
	},

	setPositron: function(positron) {
		if(!this.element) return;
		this.positron = positron || this.getPositron();
	},

	getPositron: function() {
		if(!this.element) return;
		return selectron.get(this.element);
	},

	size: function() {
		if(!this.element) return;
		return this.undos.length;
	},

	enable: function() {
		if(!this.element) return;
		if(!this.enabled) {
			this.observer.observe(this.element, this.config);
			this.enabled = true;
		}
	},

	disable: function() {
		if(this.enabled) {
			this.observer.disconnect();
			this.enabled = false;
		}
	},

	undo: function() {
		if(this.enabled && this.undoIndex >= 0) {
			this.undoRedo(this.undos[this.undoIndex], true);
			this.undoIndex--;
		}
	},

	undoRedo: function(undo, isUndo) {
		if(!this.element) return;
		this.disable();
		if(this.mutations.length > 0) {
			this.register();
		}
		var mutations = isUndo ? undo.mutations.slice(0).reverse() : undo.mutations;
		for(var s = 0; s < mutations.length; s++) {
			var mutation = mutations[s];
			switch(mutation.type) {
				case 'characterData':
					mutation.target.textContent = isUndo ? mutation.oldValue : mutation.newValue;
					break;
				case 'attributes':
					mutation.target.attr(mutation.attributeName, isUndo ? mutation.oldValue : mutation.newValue);
					break;
				case 'childList':
					var addNodes = isUndo ? mutation.removedNodes : mutation.addedNodes;
					var removeNodes = isUndo ? mutation.addedNodes : mutation.removedNodes;
					for(var j = 0; j < addNodes.length; j++) {
						if (mutation.nextSibling) {
							mutation.nextSibling.before(addNodes[j]);
						} else {
							mutation.target.append(addNodes[j]);
						}
					}
					for(var i = 0; i < removeNodes.length; i++) {
						removeNodes[i].vanish();
					}
					break;
			}
		}

		if(isUndo) undo.positrons.before.restore();
		else undo.positrons.after.restore();
		this.enable();
	}
};
module.exports = Snapback;
