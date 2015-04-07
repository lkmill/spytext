var MOD = require('tcb-mod');

var assign = MOD.assign;

var p = Element.prototype;
assign(p, 'tidy', function(tagName) {
	var that = this;
	tagName = tagName || this.tagName;
	function recurse(node, isEmptied, isRecursed, tagNode) {
		if(!node) return;

		if(!isRecursed && node.firstChild) {
			if(!isEmptied && node.tagName === tagName) {
				node.emptyNested();
				isEmptied = true;
			}
			recurse(node.firstChild, isEmptied, false, null);
		}

		if(node === that) return;

		var next = node.nextSibling;

		if(!isRecursed && next) {
			recurse(next, false, false, null);
		}

		if(next && next.nodeType === 1 && node.nodeType === 1 && next.isInline() && (tagNode || node.isInline())) {
			var tagNext = next.getTag(tagName);
			if(!tagNext) return recurse(next, isEmptied, true);

			if(!tagNode) {
				tagNode = node.getTag(tagName);
				if(!tagNode) return recurse(next, isEmptied, true, tagNext);
			}

			if(tagNode === node) {
				if(tagNext === next) {
					while(next.firstChild) {
						node.append(next.firstChild);
					}
					next.vanish();
				} else {
					node.append(next);
					tagNext.unwrap();
				}
				return recurse(node, isEmptied, true, tagNode);
			} else {
				if(tagNext === next) {
					next.prepend(node);
					tagNode.unwrap();
					return recurse(next, isEmptied, true, next);
				} else {
					var tmp = MOD.O('<' + tagName + '></' + tagName + '>');
					node.before(tmp);
					tmp.append(node);
					tmp.append(next);
					tagNode.unwrap();
					tagNext.unwrap();
					return recurse(tmp, isEmptied, true, tmp);
				}
			}
		}
		recurse(next, isEmptied, true, null);
	}
	recurse(this, false, false, null);
	this.normalize();
	recurse(this, false, false, null);
	this.normalize();
	this.setBR();
	return this;
});
assign(p, 'setBR', function() {
	if(this.firstChild && this.firstChild === this.lastChild && this.firstChild.nodeType === 3 && this.firstChild.textContent.length === 0) this.removeChild(this.firstChild);
	if(!this.firstChild) this.appendChild(MOD.O('<BR>'));
	else {
		var br = this.getElementsByTagName('BR');
		var length = br.length;
		for(var i = 0; i < length; i++) {
			if(br[i].previousSibling) {
				br[i].vanish();
				i--;
				length--;
			}
		}
	}
});
assign(p, 'unwrap',  function() {
	var nodes = [];
	while(this.lastChild) {
		nodes.push(this.lastChild);
		this.after(this.lastChild);
	}
	this.vanish();
	return MOD.M(nodes);
});
assign(p, 'emptyNested', function(tagName) {
	// TODO make it so you can delete by selector as well
	tagName = tagName || this.tagName;
	var nested = MOD.M(this.getElementsByTagName(tagName));
	nested.each(function(element) {
		this.unwrap();
	});
});
assign(p, 'isTag', function(tagName) {
	return this.tagName === tagName;
});
assign(p, 'getTag', function(tagName) {
	// TODO make it so you can delete by selector as well
	tagName = tagName || this.tagName;
	var tag = null;
	if(this.tagName === tagName) {
		return this;
	}
	var tmp = this;
	while(tmp.firstChild && tmp.firstChild === tmp.lastChild) {
		if(tmp.tagName === tagName) {
			return tmp;
		}
		tmp = tmp.firstChild;
	}
	return null;
});
p = Node.prototype;
assign(p, 'ancestors', function(ufo, stop) {
	var ancestors = [];
	var node = this.closest(ufo, stop);
	while(node) {
		ancestors.push(node);
		node = node.closest(ufo, stop);
	}
	return MOD.M(ancestors);
});
assign(p, 'isBlock', function() {
	return this && this.nodeType === 1 && !getComputedStyle(this).display.match(/inline/);
});
assign(p, 'isInline', function() {
	return this && (this.nodeType === 3 || !getComputedStyle(this).display.match(/inline/));
});
