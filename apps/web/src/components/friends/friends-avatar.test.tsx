import { render, screen } from "@testing-library/react";
import { FriendsAvatar } from "./friends-avatar";

describe("FriendsAvatar", () => {
  it("shows initials from the first two name parts when there is no image", () => {
    render(<FriendsAvatar name="Dingle Varshney" avatarUrl={null} />);

    expect(screen.getByText("DV")).toBeInTheDocument();
  });

  it("shows the default initial when the name is empty", () => {
    render(<FriendsAvatar name=" " avatarUrl={null} />);

    expect(screen.getByText("M")).toBeInTheDocument();
  });
});
