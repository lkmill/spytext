var $ = angular.element;
var buttons = {
	bold: { title: 'Bold', action: 'format', options: { command: 'bold' }},
	strikeThrough: { title: 'Strike Through', action: 'format', options: { command: 'strikeThrough' }},
	underline: { title: 'Underline', action: 'format', options: { command: 'italic' }},
	italic: { title: 'Italic', action: 'format', options: { command: 'bold' }},
	removeFormat: { action: 'format', options: { command: 'removeFormat' }},
};
var fieldPresets = {
	full: {
		buttons: [ 'bold', 'italic', 'underline', 'strikeThrough', 'removeFormat' ]
	}
};

angular.module('Spytext', [])

.factory('Spytext', function() {
	function removeContainer(container) {
		while(container.lastChild) {
			container.after(container.lastChild);
		}
		container.remove();
	}
	function normalize(node, tagName) {
		tagName = (tagName || 'b').toLowerCase();
		var org = node;
		while(node && node.nextSibling) {
			console.log(node.tagName);
			if (node.nodeType === 1 && node.nextSibling.nodeType === 1 && node.tagName.toLowerCase() === tagName) {
				var next = node.nextSibling;
				if(next.tagName.toLowerCase() === tagName) {
					while(next.firstChild) {
						node.append(next.firstChild);
					}
					next.remove();
				} else {
					var tmp = next;
					while(tmp.firstChild && tmp.firstChild === tmp.lastChild) {
						if(tmp.tagName.toLowerCase() === tagName) {
							node.append(next);
							while(tmp.firstChild) {
								tmp.before(tmp.firstChild);
							}
							tmp.remove();
						}
						tmp = tmp.firstChild;
					}
				}
			}
			node = node.nextSibling;
		}
		org.normalize();
	}
	var actions = {
		align: function(options, element) {
			var listTags = ['ul', 'ol'];
			if (selectron.intersectsTags(listTags, element)) {
				alert('You cannot align lists!');
			} else {
				var command = 'justify' + attribute.charAt(0).toUpperCase() + attribute.slice(1).toLowerCase();
				document.execCommand(command);
			}
		},
		list: function(options, element0){
			// TODO check if already in a list
			var containedChildren = selectron.getChildElements(element, true);
				
			var list, tag;
			// TODO concat to existing list if list and other blocks are selected
			if(containedChildren.exists('ul, ol')) {
				list = [];
				tag = 'p';
				containedChildren = containedChildren.childs();
			} else {
				list = MOD('<' + attribute + '></' + attribute + '>');
				tag = 'li';
			}
			containedChildren.each(function() {
				var item = MOD('<' + tag + '>' + this.textContent + '</' + tag + '>');
				if(list instanceof Array) list.push(item);
				else list.append(item);
			});
			selectron.selectNodes(containedChildren);
		
			list = insertElement(MOD(list), element);

			selectron.setCaretAtEndOfElement(list);
		},
		indent: function(){
			// TODO see if we can get this to work
			var tags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
			var listTags = ['ul', 'ol', 'li'];
			if (selectron.intersectsTags(tags, element) || !selectron.intersectsTags(listTags, element)) {
				alert('You can only indent lists!');
				return;
			}
			var currentLiElement = selectron.getContainingElement('li');
			var previousLiElement = currentLiElement.previousSibling;
			if(!previousLiElement) {
				alert('you cannot indent the first item in a list');
				return;
			}
			var listElement = selectron.getContainingElement('ul, ol');
			var listType = listElement.tagName.toLowerCase();

			var $list = $('<' + listType + '></' + listType + '>');
			// TODO if we get it to work, loop through all <LI> instead of just one
			var $li = $('<li>' + currentLiElement.textContent + '</li>');
			$list.append($li);

			//insertHtml($list[0].outerHTML, false);
			previousLiElement.appendChild($list[0]);
			selectron.setCaretAtEndOfElement($list[0]);
			currentLiElement.remove();
		},
		format: function(options, element){
			//document.execCommand(options.command);
			var containers = {
				underline: '<u></u>',
				bold: '<b></b>'
			};
			options.container = options.container || containers[options.command];
			var wrap = [];
			if(selectron.isCollapsed()){
				var closest = selectron.getStart().node.closest('b, [spytext-field] > *'); 
				if(closest.parentNode !== element){
					removeContainer(closest);
				} else {
					wrap = closest.descendants(3);
				}
			} else {
				var modify = [];
				var contained = selectron.getTextNodes(element).toArray();

				var start = selectron.getStart();
				var end = selectron.getEnd();
				if(end.offset < end.node.textContent.length - 1) {
					end.node.splitText(end.offset);
				}
				if(start.offset > 0) {
					wrap = contained.slice(1);
					wrap.push(start.node.splitText(start.offset));
				} else {
					wrap = contained;
				}
			}
			MOD(wrap).wrap(options.container);
			normalize(element);
		},
		link: function (attribute, element) {
			var sel = window.getSelection();
			var node = sel.focusNode.parentNode;
			if (node.tagName.toLowerCase() !== 'a') {
				node = sel.anchorNode.parentNode;
				if (node.tagName.toLowerCase() !== 'a') {
					node = null;
				}
			}

			var href = 'http://';
			if (node) {
				var range = document.createRange();
				range.selectNodeContents(node);
				href = node.attributeibutes.href.value;
				sel.removeAllRanges();
				sel.addRange(range);
			}
			var result = prompt('Link address:', href);

			if (result !== '') {
				document.execCommand('createLink', null, result);
			} else {
				document.execCommand('unlink');
			}

		},
		paste: function(options, element) {
			var listTags = ['ul', 'ol', 'li'];
			if (selectron.intersectsTags(listTags, $element[0])) {
				alert('You cannot paste in lists!');
				return;
			}
			var sel = window.getSelection();
			var savedRange = selectron.save();
			var pasteArea = MOD('<textarea style="position: absolute; top: -1000px; left: -1000px; opacity: 0;" id="paste-area"></textarea>');
			document.body.append(pasteArea);
			pasteArea.focus();
			setTimeout(function () {
				$element[0].focus();
				selectron.restore(savedRange);
				var str = unescape(pasteArea.value.trim());
				str = str.split('\u2022').join('');
				str = str.replace(/\n+/g, '</p><p>');
				pasteArea.remove();
				Spytext.insertHtml(str);
			}, 1);
			if(!document.execCommand('insertHTML', false, html)) {
				var rng = selectron.save();
				document.execCommand('delete', false);
				var nodes = document.createFromHtml(html);
				var l = (nodes instanceof NodeList) ? nodes.length : 1;
				if(l === 1) {
					rng.insertNode(nodes);
				} else {
					for(var i = l - 1; i >= 0; i--) {
						rng.insertNode(nodes[i]);
					}
				}
			}
		},
		type: {}
	};
	var execute = function(action, options, element) {
		actions[action](options, element);
	};
	return {
		execute: execute
	};
})

.filter('dashes', function() {
	return function(input) {
		var REGEXP = /[A-Z1-9]/g;
		var SEPARATOR = '-';
		return input.replace(REGEXP, function(letter, pos) {
			return (pos ? SEPARATOR : '') + letter.toLowerCase();
		});
	};
})
.directive('spytext', function($compile, Spytext) {
	return {
		restrict: 'A',
		controller: function($scope, $element) {
			$scope.elements = [];
			$scope.buttons = [];
			$scope.activateButtons = function(buttons) {
				_.each($scope.buttons, function(buttonElement) {
					if(buttons.indexOf(buttonElement.name) > -1) {
						buttonElement.disabled = false;
					}
				});
			};
			$scope.deactivateButtons = function() {
				_.each($scope.buttons, function(buttonElement) {
					if($(buttonElement).attr('global') !== 'true') {
						buttonElement.disabled = true;
					}
				});
			};
			$scope.buttonClick = function(e, button) {
				e.preventDefault();
				var element = selectron.getContainingElement('[spytext-field]');
				if(button.global || (element && $scope.elements.indexOf(element) > -1)) {
					Spytext.execute(button, element);
					if(element) element.focus();
				} else {
					alert('Element does not belong to Spytext!');
				}
			};
		},
		link: function(scope, $element, attributes) {
			$element.prepend($compile('<spytext-toolbar></spytext-toolbar>')(scope));
		}
	};
})
.directive('spytextToolbar', function() {
	return {
		restrict: 'AE',
		template: '<div class="spytext-toolbar">' + 
		'<ul ng-repeat="group in buttonGroups" class="spytext-button-group"  ng-class="group.name">' +
		'<li ng-repeat="button in group.buttons"><spytext-button st-button-type="{{ button }}"></spytext-button></li>' +
		'</ul>' +
		'</div>',
		replace: true,
		controller: function($scope) {
			$scope.buttonGroups = [
				//{ name: 'undo', buttons: ['undo', 'redo']},
				//{ name: 'type', buttons: ['typeParagraph', 'typeHeading1', 'typeHeading2', 'typeHeading3', 'typeHeading4', 'typeHeading5', 'typeHeading6'] },
				{ name: 'format', buttons: ['bold', 'underline', 'strikeThrough', 'removeFormat']}
				//['link'],
				//{ name: 'align', buttons: ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify']},
				//{ name: 'list', buttons: ['listUnordered', 'listOrdered']},
				//{ name: 'indent', buttons: ['indentRight', 'indentLeft']},
				//['reset']
			];
		},
		link: function(scope, $element,attributes) {
			$element.on('mousedown', function(e) {
				e.preventDefault();
			});
		}
	};
})
.directive('spytextButton', function(Spytext) {
	return {
		restrict: 'AE',
	template: '<button ng-click="buttonClick($event, button)" title="{{ buttonProperties.title }}" class="spytext-button" ng-class="buttonType | dashes" tabindex="-1"><span>{{ buttonProperties.title }}</span></button>',
	replace: true,
	link: function(scope, $element, attributes) {
		scope.buttons.push($element[0]);
		scope.buttonType = attributes.stButtonType;
		scope.button = buttons[attributes.stButtonType];
		$element.attr('name', attributes.stButtonType);
		$element.attr('global', (scope.button.global ? 'true' : 'false'));
		if(!scope.button.global) {
			$element[0].disabled = true;
		}
	}
	};
})
.directive('spytextField', function(Spytext) {
	return {
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, $element, attributes, ngModelCtrl) {
			var timeout = null;
			var isTyping = false;
			var oldValue = null;
			var newValue = null;
			var observer = new MutationObserver(function(mutations) {
				mutations.forEach(function(mutation) {
					function finishedTyping() {
						clearTimeout(timeout);
						var undo = { target: target, oldValue: oldValue, newValue: newValue }; 
						addUndo(undo);
						setUndo();
						oldValue = null;
						newValue = null;
						isTyping = false;
					}
					var fix = false;
					switch(mutation.type) {
						case 'childList':
							if(isTyping) finishedTyping();
							if (mutation.target === $element[0]) {
								_.each(mutation.addedNodes, function(node) {
									if(node.nodeType === 3 || node.nodeName.toLowerCase() === 'div') {
										fix = true;
										var content = node.textContent !== '' ? node.textContent : '<br />';
										var p = MOD('<p>' + content + '</p>');
										toggleUndo();
										node.replaceWith(p);
										toggleUndo();
										selectron.setCaretAtEndOfElement(p);
										addUndo({ addedNodes: [ p ], removedNodes: [], target: mutation.target, next: p.nextSibling, prev: p.previousSibling });
									}
								});
							} else {
								_.each(mutation.addedNodes, function(node) {
									if(node.nodeType ===1 ) {
										node.removeAttribute('style');
										if(node.nodeName.toLowerCase() === 'span') {
											fix = true;
											if(node.firstChild) {
												var prev = node.previousSibling;
												var oldValue = prev.textContent;
												var rng = selectron.save();
												toggleUndo();
												prev.textContent = prev.textContent + node.textContent;
												node.remove();
												toggleUndo();
												addUndo({ target: prev, oldValue: oldValue, newValue: prev.textContent});
												selectron.setCaretAt(prev, oldValue.length);
											} else {
												node.remove();
											}
										}
									}
								});
							}
							if(!fix) addUndo(mutation);
							break;
						case 'characterData':
							var undo = { target: mutation.target, oldValue: mutation.oldValue, newValue: mutation.target.textContent }; 
							addUndo(undo);
							//if(!isTyping) {
							//	oldValue = mutation.oldValue;
							//	isTyping = true;
							//	target = mutation.target;
							//} else {
							//	clearTimeout(timeout);
							//	newValue = mutation.target.textContent;
							//}
							//timeout = setTimeout(function() {
							//	finishedTyping();
							//}, 1000);
							break;
					}
				});    
			});
			 
			// configuration of the observer:
			//var config = { subtree: true, childList: true };
			var config = { subtree: true, childList: true, characterData: true, characterDataOldValue: true };
			 
			// pass in the target node, as well as the observer options
			 
			function toggleUndo() {
				if(undoOn) observer.disconnect();
				else observer.observe($element[0], config);
				undoOn = !undoOn;
			}
			function addUndo(mutation) {
				if(mutation.oldValue) {
					undoItem.push({ target: mutation.target, oldValue: mutation.oldValue, newValue: mutation.target.textContent });
				} else {
					var addedNodes = [];
					_.each(mutation.addedNodes, function(node) {
						addedNodes.push({ target: node, next: mutation.nextSibling, prev: mutation.previousSibling, parent: mutation.target });
					});
					var removedNodes = [];
					_.each(mutation.removedNodes, function(node) {
						var next = mutation.nextSibling;
						var prev = mutation.previousSibling;
						removedNodes.push({ target: node, next: next, prev: prev, parent: mutation.target });
					});
					var obj = { addedNodes: addedNodes, removedNodes: removedNodes};
					undoItem.push(obj);
				}
			}
			function setUndo() {
				console.log('adding to undoStack');
				if(undoIndex < undoStack.length - 1) {
					console.log('clearing some undos');
					undoStack = undoStack.slice(0, undoIndex + 1);
				}
				undoStack.push({ selectionBefore: selectionBefore, selectionAfter: selectron.saver(), undos: undoItem });
				undoItem = [];
				undoIndex = undoStack.length -1;
				selectionBefore = selectron.saver();
			}
			function undoRedo(u, isUndo) {
				toggleUndo();
				var undos = isUndo ? u.undos.slice(0).reverse() : u.undos;
				for(var s = 0; s < undos.length; s++) {
					if(undos[s].oldValue) {
						undos[s].target.textContent = isUndo ? undos[s].oldValue : undos[s].newValue;
					} else {
						var addNodes = isUndo ? undos[s].removedNodes : undos[s].addedNodes;
						var removeNodes = isUndo ? undos[s].addedNodes : undos[s].removedNodes;
						for(var j = 0; j < addNodes.length; j++) {
							var node = addNodes[j];
							if (node.next) {
								node.parent.insertBefore(node.target, node.next);
							} else {
								node.parent.append(node.target);
							}
						}
						for(var i in removeNodes) {
							removeNodes[i].target.remove();
						}
					}
				}
				selectron.restorer(isUndo ? u.selectionBefore : u.selectionAfter);
				toggleUndo();
			}
			function undo() {
				if(undoOn && undoIndex >= 0) {
					undoRedo(undoStack[undoIndex], true);
					undoIndex--;
				} else {
					console.log('undo: nothing to do');
					console.log(undoIndex);
				}

			}
			function redo() {
				if(undoOn && undoIndex < undoStack.length - 1) {
					undoIndex++;
					undoRedo(undoStack[undoIndex], false);
				} else {
					console.log('redo: nothing to do');
					console.log(undoIndex);
				}
			}
			function updateSelection() {
				selectionBefore = selectron.saver();
			}
			scope.elements.push($element[0]);
			var buttons = fieldPresets[attributes.stFieldPreset].buttons;
			var fixing = false;
			var undoItem = [];
			var undoStack = [];
			var undoIndex = undoStack.length - 1;
			var undoOn = false;
			var selectionBefore;
			$element.attr('contenteditable', 'true');
			$element.on('focus', function () {
				scope.activateButtons(buttons);
				toggleUndo();
				if(!mousedown) {
					updateSelection();
				}
			});
			$element.on('blur', function () {
				toggleUndo();
				scope.deactivateButtons();
				if(ngModelCtrl.$dirty) {
					scope.$apply(function() {
						ngModelCtrl.$setViewValue($element.html());
					});
				}
			});
			var mousedown = false;
			$element.on('mousedown', function(e) {
				mousedown = true;
			});
			$(document).on('mouseup', function(e) {
				if(mousedown) {
					if(undoItem.length > 0) setUndo();
					updateSelection();
				}
				mousedown = false;
			});
			$element.on('keyup', function(e) {
				if(!e.ctrlKey) {
					switch(e.keyCode) {
						case 37:
						case 38:
						case 39:
						case 40:
							if(undoItem.length > 0) setUndo();
							updateSelection();
							break;
					}
				}
			});
			$element.on('keydown', function(e) {
				if(!ngModelCtrl.$dirty && ngModelCtrl.$viewValue !== $element.html()) {
					scope.$apply(function() {
						ngModelCtrl.$setViewValue($element.html());
					});
				}
				if (e.ctrlKey) {
					switch(e.keyCode) {
						case 66://b
						case 85://u
							e.preventDefault();
							var arr = [];
							arr[66] = 'bold';
							arr[85] = 'underline';
							if(undoItem.length > 0) setUndo();
							Spytext.execute('format', { command: arr[e.keyCode] }, $element[0]);
							setTimeout(function() {
								setUndo();
							}, 1000);
							break;
						case 89://y
							e.preventDefault();
							redo();
							break;
						case 90://z
							e.preventDefault();
							undo();
							break;
						case 65://a
							e.preventDefault();
							selectron.selectNodeContents($element[0]);
							break;
						case 86://v
							Spytext.execute('paste', null, $element[0]);
							break;
					}
				}

			});
			$element.on('paste', function (e) {
				e.preventDefault();
			});
			ngModelCtrl.$render = function() {
				$element.html(ngModelCtrl.$viewValue);
			};
		}
	};
});
