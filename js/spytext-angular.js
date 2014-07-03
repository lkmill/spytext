var module = angular.module('spytext', []);

module.factory('SpyText', function($window) {
	return $window.SpyText;
});