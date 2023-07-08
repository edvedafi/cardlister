import { ask } from "../utils/ask.js";
import { addCardData, mockSavedSetData } from "./cardData.js";
jest.mock("../utils/ask.js");
jest.mock("fs-extra");

beforeEach(() => {
  ask.mockReset();
});

afterEach(() => {
  ask.mockReset();
});

describe("addCardData", () => {
  it("should add the saved value to the array if one exists", async () => {
    const output = {
      name: "test",
    };
    mockSavedSetData({
      testProp: "Saved Value",
    });
    const defaultValues = {
      testProp: "Default Value",
    };
    const options = "Some Options to pass to ask";

    await addCardData("Test Prop", output, "testProp", defaultValues, options);

    expect(ask.mock.calls.length).toBe(0);

    expect(output.testProp).toBe("Saved Value");
  });

  it('should leave the prop blank if the value is "no"', async () => {
    const output = {
      name: "test",
    };
    mockSavedSetData({
      testProp: "N",
    });
    const defaultValues = {
      testProp: "Default Value",
    };
    const options = "Some Options to pass to ask";

    await addCardData("Test Prop", output, "testProp", defaultValues, options);

    expect(ask.mock.calls.length).toBe(0);

    expect(output.testProp).toBeUndefined();
  });

  it('should "ask" for the value if saved data does not exist', async () => {
    const output = {
      name: "test",
    };
    mockSavedSetData(undefined);
    const defaultValues = {
      testProp: "Default Value",
    };
    const options = "Some Options to pass to ask";
    ask.mockResolvedValue("Asked Value");

    await addCardData("Test Prop", output, "testProp", defaultValues, options);

    expect(ask.mock.calls.length).toBe(1);
    //check the arguments passed to ask
    expect(ask.mock.calls[0][0]).toBe("Test Prop");
    expect(ask.mock.calls[0][1]).toBe("Default Value");
    expect(ask.mock.calls[0][2]).toBe(options);
    expect(output.testProp).toBe("Asked Value");
  });
});
