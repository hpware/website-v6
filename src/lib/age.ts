import { birthday } from "../data/about.json";

// Born at midnight Taipei time; 365.2425 days is the average Gregorian year.
const born = new Date(`${birthday}T00:00:00+08:00`).getTime();
const msPerYear = 365.2425 * 24 * 60 * 60 * 1000;

export function preciseAge(now = Date.now()) {
    return ((now - born) / msPerYear).toFixed(8);
}
