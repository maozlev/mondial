import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MatchCard, type MatchCardProps } from "@/components/MatchCard";

const BASE_MATCH: MatchCardProps["match"] = {
  id: "m1",
  homeTeam: "Brazil",
  awayTeam: "Morocco",
  groupName: "C",
  scheduledAt: "2026-06-13T22:00:00.000Z",
  status: "UPCOMING",
  homeScore: null,
  awayScore: null,
};

describe("MatchCard – view mode", () => {
  it("renders home and away team names", () => {
    render(<MatchCard match={BASE_MATCH} />);
    expect(screen.getByText("Brazil")).toBeInTheDocument();
    expect(screen.getByText("Morocco")).toBeInTheDocument();
  });

  it("renders group badge", () => {
    render(<MatchCard match={BASE_MATCH} />);
    expect(screen.getByText(/בית C/)).toBeInTheDocument();
  });

  it("renders flag images with correct alt text", () => {
    render(<MatchCard match={BASE_MATCH} />);
    expect(screen.getByAltText("Brazil")).toBeInTheDocument();
    expect(screen.getByAltText("Morocco")).toBeInTheDocument();
  });

  it("shows time for UPCOMING match", () => {
    render(<MatchCard match={BASE_MATCH} />);
    // UTC 22:00 → Israel time is UTC+3 = 01:00. We test that some time string renders.
    const timeEl = screen.getByRole("time");
    expect(timeEl).toBeInTheDocument();
  });

  it("shows final score for FINISHED match", () => {
    render(
      <MatchCard
        match={{ ...BASE_MATCH, status: "FINISHED", homeScore: 2, awayScore: 1 }}
      />
    );
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText(/FINISHED|סיום|גמר/i)).toBeInTheDocument();
  });

  it("shows lock badge for LOCKED match", () => {
    render(<MatchCard match={{ ...BASE_MATCH, status: "LOCKED" }} />);
    expect(screen.getByText("נעול")).toBeInTheDocument();
  });

  it("does not render score inputs in view mode", () => {
    render(<MatchCard match={BASE_MATCH} />);
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });
});

describe("MatchCard – predict mode", () => {
  it("renders score inputs when mode=predict and match is UPCOMING", () => {
    render(<MatchCard match={BASE_MATCH} mode="predict" homeScore={0} awayScore={0} onHomeChange={vi.fn()} onAwayChange={vi.fn()} />);
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs).toHaveLength(2);
  });

  it("inputs are disabled when match is LOCKED", () => {
    render(
      <MatchCard
        match={{ ...BASE_MATCH, status: "LOCKED" }}
        mode="predict"
        homeScore={1}
        awayScore={0}
        onHomeChange={vi.fn()}
        onAwayChange={vi.fn()}
      />
    );
    const inputs = screen.getAllByRole("spinbutton");
    for (const input of inputs) {
      expect(input).toBeDisabled();
    }
  });

  it("calls onHomeChange when home input changes", async () => {
    const onHomeChange = vi.fn();
    render(
      <MatchCard
        match={BASE_MATCH}
        mode="predict"
        homeScore={0}
        awayScore={0}
        onHomeChange={onHomeChange}
        onAwayChange={vi.fn()}
      />
    );
    const [homeInput] = screen.getAllByRole("spinbutton");
    await userEvent.clear(homeInput);
    await userEvent.type(homeInput, "3");
    expect(onHomeChange).toHaveBeenCalled();
  });

  it("shows saved checkmark when isSaved=true", () => {
    render(
      <MatchCard
        match={BASE_MATCH}
        mode="predict"
        homeScore={1}
        awayScore={0}
        onHomeChange={vi.fn()}
        onAwayChange={vi.fn()}
        isSaved
      />
    );
    expect(screen.getByTitle(/נשמר|saved/i)).toBeInTheDocument();
  });
});
