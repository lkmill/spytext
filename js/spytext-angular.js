var $ = angular.element;

angular.module('Spytext', [])

.factory('Spytext', function() {
	function removeNestedTags(node, tagName) {
		tagName = tagName || node.tagName;
		var nested = M(node.getElementsByTagName(tagName));
		console.log(nested);
		_.each(nested, function(element) {
			console.log('element');
			console.log(element);
			removeContainer(element);
		});
	}
	function getTag(node, tagName) {
		tagName = tagName || node.tagName;
		var tag = null;
		if(node.tagName === tagName) {
			tag = node;
		} else {
			var tmp = node;
			while(tmp.firstChild && tmp.firstChild === tmp.lastChild) {
				if(tmp.tagName === tagName) {
					tag = tmp;
					break;
				}
				tmp = tmp.firstChild;
			}
		}
		return tag;
	}
	function normalize(node, tagName) {
		console.log('normalize: ' + tagName);
		var child = node.firstChild;
    var tmp;
		var iteration = 0;
		while(child && child.nextSibling) {
      next = child.nextSibling;
			if (child.nodeType === 1 && next.nodeType === 1){
        var tagNode = getTag(child, tagName);
        if(!tagNode) {
					child = child.nextSibling;
					iteration++;
					continue;
				}
				removeNestedTags(tagNode);

        var tagNext = getTag(next, tagName);
        if(!tagNext) {
					child = child.nextSibling;
					iteration++;
					continue;
				}
				console.log(tagNext);
				removeNestedTags(tagNext);

				if(tagNode === child) {
					if(tagNext === next) {
            while(next.firstChild) {
              child.append(next.firstChild);
            }
						next.remove();
          } else {
            child.append(next);
						removeContainer(tagNext);
          tagNext.remove();
          }
					continue;
        } else {
					if(tagNext === next) {
						next.prepend(child);
						removeContainer(tagNode);
					} else {
						var newElement = O('<' + tagName + '></' + tagName + '>');
						child.before(newElement);
						newElement.append(child);
						newElement.append(next);
						removeContainer(tagNode);
						removeContainer(tagNext);
						child = newElement;
						continue;
					}
        }
      }
			iteration++;
			child = child.nextSibling;
		}
		node.normalize();
	}
  function normalizeElement(element, tagName) {
		console.log('normalizeElement, tagName: ' + tagName);
		_.each(element.childNodes, function(child) {
			normalize(child, tagName);
		});
  }
	function removeContainer(container) {
		while(container.lastChild) {
			container.after(container.lastChild);
		}
		container.remove();
	}

	var actions = {
		align: function(options, element) {
		},
		list: function(options, element0){
		},
		indent: function(){
		},
		format: function(options, element){
			var tags = {
				underline: 'U',
				bold: 'B'
			};
			options.container = O(options.container) || O('<' + tags[options.command] + '></' + tags[options.command] + '>');
			var wrap = [];
			var coordinates = S.get.coordinates();
			if(S.isCollapsed()){
				var closest = coordinates.start.node.closest('b, [spytext-field] > *'); 
				if(closest.parentNode !== element){
					removeContainer(closest);
				} else {
					wrap = closest.descendants(3);
				}
			} else {
				var modify = [];
				var contained = S.get.textNodes(element).toArray();

				var start = coordinates.start;
				var end = coordinates.end;
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
			M(wrap).wrap(options.container);
			normalizeElement(element, options.container.tagName);
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
		},
		type: {}
	};
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
	return {
		actions: actions,
		buttons: buttons,
		fieldPresets: fieldPresets
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
			function execute(action, options, element) {
				Spytext.actions[action](options, element);
			}
			var mousedown = false;
			var events = {
				element: {
					focus: function () {
						//$scope.activateButtons(buttons);
						$scope.snapback.toggle();
						//if(!mousedown) {
						//	updateSelection();
						//}
					},
					blur: function () {
						$scope.snapback.toggle();
						$scope.deactivateButtons();
					},
					mousedown: function(e) {
						//mousedown = true;
					},
					keyup: function(e) {
						if(!e.ctrlKey) {
							switch(e.keyCode) {
								case 37:
								case 38:
								case 39:
								case 40:
									console.log(e);
									console.log(this);
									break;
							}
						}
					},
					keydown: function(e) {
						if (e.ctrlKey) {
							switch(e.keyCode) {
								case 66://b
								case 85://u
									e.preventDefault();
									var arr = [];
									arr[66] = 'bold';
									arr[85] = 'underline';
									$scope.snapback.register();
									execute('format', { command: arr[e.keyCode] }, this);
									setTimeout(function() {
										$scope.snapback.register();
									}, 10);
									break;
								case 89://y
									e.preventDefault();
									$scope.snapback.redo();
									break;
								case 90://z
									e.preventDefault();
									$scope.snapback.undo();
									break;
								case 65://a
									e.preventDefault();
									S.select(this);
									break;
								case 84://t
									e.preventDefault();
									//console.log(window.getSelection().getRangeAt(0).extractContents());
									break;
								case 86://v
									console.log('pasting');
									//execute('paste', null, this);
									break;
							}
						}
					},
					paste: function (e) {
						console.log('pasteEvent');
					//document.execCommand('insertHtml', false, pasteArea.val().replace(/</g, '&lt;').replace(/>/, '&gt;').replace(/\n+/g, '</p><p>'));
						var str;
						if(e.clipboardData) {
							console.log(e.clipboardData.items[0].getAsString(function(ufo) {
								str = ufo;
								str = str.replace(/</g, '&lt;').replace(/>/, '&gt;').replace(/\n+/g, '</p><p>');
								console.log(str);
							}));
						} else {
							str = clipboardData.getData('Text');
							str = str.replace(/</g, '&lt;').replace(/>/, '&gt;').replace(/[\n\r]+/g, '</p><p>');
							console.log(str);
						}

						e.preventDefault();
					}
				},
				doc: {
					mouseup: function(e) {
						if(mousedown) {
							if(undoItem.length > 0) setUndo();
							updateSelection();
						}
						mousedown = false;
					}
				}
			};
			$scope.addEvents = function($element) {
				_.each(events.element, function(func, name) {
					$element.on(name, func);
				});
				_.each(events.doc, function(func, name) {
					document.on(name, func);
				});
			};
			$scope.elements = [];
			$scope.buttons = [];
			$scope.snapback = null;
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
				var element = S.get.containingElement('[spytext-field]');
				if(button.global || (element && $scope.elements.indexOf(element) > -1)) {
					execute(button.action, button.options, element);
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
		scope.button = Spytext.buttons[attributes.stButtonType];
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
			var snapback = new Snapback($element[0]);
			scope.snapback = snapback;
			scope.elements.push($element);
			$element.attr('contentEditable', true);
			var buttons = Spytext.fieldPresets[attributes.stFieldPreset].buttons;
			$element.on('keydown', function(e) {
				if(!ngModelCtrl.$dirty && ngModelCtrl.$viewValue !== $element.html()) {
					scope.$apply(function() {
						ngModelCtrl.$setViewValue($element.html());
					});
				}
			});
			ngModelCtrl.$render = function() {
				$element.html(ngModelCtrl.$viewValue);
			};
			scope.addEvents($element);
		}
	};
});
