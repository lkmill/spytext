describe("spytext/commands", function() {
	describe("indents", function() {
		it("indents ancestors if selected list item is the first item in the list");
		//	- Item 1
		// 	- Item 2
		// 	- Item 3
		// 	- Item 4
		// 	- Item 5|
		// 	
		// 	4 calls of indent command should result in 
		//
		// 	- Item 1
		//		- Item 2
		//			- Item 3
		//				- Item 4
		//					- Item 5 |
	});

});
