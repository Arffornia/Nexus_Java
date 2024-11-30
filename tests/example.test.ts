describe("This is an example test suite", () => {
    beforeAll(async () => {
        // Do something before all tests of this file
    });

    afterAll(async () => {
        // Do something after all tests of this file
    }, 1 * 1000); // You also can set a different timeout

    it("A test of the test suite", () => {
        // Do some procress here

        // Check the test result
        expect(true).toEqual(true);
        expect(true).not.toEqual(false);
    });
});