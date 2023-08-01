import { ask } from "../utils/ask.js";
import {
  addCardData,
  getTeam,
  getTeamDisplay,
  mockSavedSetData,
} from "./cardData.js";
import fs from "fs-extra";
jest.mock("../utils/ask.js");
jest.mock("fs-extra");

beforeEach(() => {
  ask.mockReset();
  fs.pathExists.mockReset();
});

afterEach(() => {
  ask.mockReset();
  fs.pathExists.mockReset();
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

describe("getTeam", () => {
  it("should return a single team", async () => {
    const defaults = { sport: "football" };
    ask.mockResolvedValueOnce({
      city: "Green Bay",
      team: "Packers",
      teamDisplay: "Green Bay Packers",
    }).once;
    ask.mockResolvedValue(undefined);
    expect(await getTeam(defaults)).toEqual([
      {
        city: "Green Bay",
        team: "Packers",
        teamDisplay: "Green Bay Packers",
      },
    ]);
  });
  it("should return multiple teams", async () => {
    const defaults = { sport: "football" };
    ask.mockResolvedValueOnce({
      city: "Green Bay",
      team: "Packers",
      teamDisplay: "Green Bay Packers",
    }).once;
    ask.mockResolvedValueOnce({
      city: "Chicago",
      team: "Bears",
      teamDisplay: "Chicago Bears",
    }).once;
    ask.mockResolvedValue(undefined);
    expect(await getTeam(defaults)).toEqual([
      {
        city: "Green Bay",
        team: "Packers",
        teamDisplay: "Green Bay Packers",
      },
      {
        city: "Chicago",
        team: "Bears",
        teamDisplay: "Chicago Bears",
      },
    ]);
  });
});
describe("getTeamDisplay", () => {
  it("should return a single team", () => {
    expect(
      getTeamDisplay([
        {
          team: "Cowboys",
          searchTeam: "cowboys",
          location: "Dallas",
          searchLocation: "dallas",
          sport: "football",
          league: "nfl",
          searchExact: "dallas cowboys",
          startYear: "1960",
          endYear: "9999",
          display: "Dallas Cowboys",
        },
      ]),
    ).toEqual("Dallas Cowboys");
  });
  it("should return multiple teams", () => {
    expect(
      getTeamDisplay([
        {
          team: "Packers",
          searchTeam: "Packers",
          location: "Green Bay",
          searchLocation: "green bay",
          sport: "football",
          league: "nfl",
          searchExact: "green bay packers",
          startYear: "1919",
          endYear: "9999",
          display: "Green Bay Packers",
        },
        {
          team: "Bears",
          searchTeam: "Bears",
          location: "Chicago",
          searchLocation: "chicago",
          sport: "football",
          league: "nfl",
          searchExact: "chicago bears",
          startYear: "1919",
          endYear: "9999",
          display: "Chicago Bears",
        },
      ]),
    ).toEqual("Green Bay Packers | Chicago Bears");
  });
  it("should be null safe", () => {
    expect(getTeamDisplay()).toBeUndefined();
  });
  it("should be empty array safe", () => {
    expect(getTeamDisplay([])).toBeUndefined();
  });
});
