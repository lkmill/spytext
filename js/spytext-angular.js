var $ = angular.element;

angular.module('Spytext', [])

.filter('dashes', function() {
	return function(input) {
		var REGEXP = /[A-Z1-9]/g;
		var SEPARATOR = '-';
		return input.replace(REGEXP, function(letter, pos) {
			return (pos ? SEPARATOR : '') + letter.toLowerCase();
		});
	};
})
.directive('spytext', function($compile) {
	return {
		restrict: 'A',
		controller: function($scope, $element) {
			$scope.spytext = new Spytext();
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
		link: function(scope, $element,attributes) {
			var toolbar = new SpytextToolbar($element[0], 'standard');
			scope.buttonGroups = toolbar.config.buttonGroups;
		}
	};
})
.directive('spytextButton', function() {
	return {
		restrict: 'AE',
		template: '<button title="{{ title }}" class="spytext-button" ng-class="type | dashes" tabindex="-1"><span>{{ title }}</span></button>',
		replace: true,
		link: function(scope, $element, attributes) {
			var button = scope.spytext.addButton($element[0], attributes.stButtonType);
			scope.type = attributes.stButtonType;
			scope.title = button.config.title;
		}
	};
})
.directive('spytextField', function() {
	return {
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, $element, attributes, ngModelCtrl) {
			scope.spytext.addField($element[0], 'full', new Snapback($element[0], 'spytext'));
			$element.on('keydown', function(e) {
				if(!ngModelCtrl.$dirty && ngModelCtrl.$viewValue !== $element.html()) {
					scope.$apply(function() {
						ngModelCtrl.$setViewValue($element.html());
					});
				}
			});
			$element.on('blur', function() {
				if(ngModelCtrl.$dirty) {
					scope.$apply(function() {
						ngModelCtrl.$setViewValue(element.html());
					});
				}
			});

			ngModelCtrl.$render = function() {
				$element.html(ngModelCtrl.$viewValue);
			};
		}
	};
});
