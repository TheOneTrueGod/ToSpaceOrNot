I want to build a web game.  The general theme of the game will be piloting a space ship, so any backgrounds should be on the darker side, with metal plating & display monitors as the feel of the interactive parts of the site to give the feel of navigating a ship through space.

It will be for two players who have access to various systems in a ship.  There will be no networking; The game will be played by two people on two separate computers sitting in the same room. It will be made with a combination of HTML & Javascript elements, and canvases that represent different ship systems.

1. Home Page
The first page the user should see is the home page.  It will display the name of the game centered at the top of the page.  Underneath that should be a small animated rocket that is slowly tilting up, and then down by about 20 degrees, while leaving a small trail of fire and smoke which flies off to the left side of the screen.  Below the ship animation should be two buttons (one for each player), which read "Gobi" and "Ben".  When the player clicks on these, they should be soft redirected to the next page, the "play" page with the player selected set in the URL & accessible via a local variable.

2. Ship State
The Ship State will be stored in a redux store, which will contain a variety of stats about the ship's current status, and the state of the ship's subsystems.  The stats will be as follows;
Distance to destination (with a current value and a max that starts at 1000)
Hull Damage (with a current value and a max that starts at 100)
Oxygen Levels (with a current value and a max that starts at 100)
Navigation Alignment (expressed as a %)
Fuel Levels (with a current value and a max value that starts at 100)
Battery Power (with a current value and a max value that starts at 100)
Game clock (with a 'minutes' and a 'seconds' value.  These will not necessarily correspond to real-world minutes or seconds, it will just be for display purposes.  I will call the internal minutes "GameMinutes" and the internal seconds "GameSeconds")
Alerts (A list of Alert objects -- these will be detailed later)
The redux store should also have an "advance time" event that can be called by the main game timer, which will be a placeholder for now

3. Play Page
The play page is where most of the gameplay will happen.

The play page will be separated into a few different sections, an upper left Status Monitor, a lower left Ship Manual, and a Stations section on the right.

3.a. Status Monitor
The status monitor should occupy the upper left quadrant of the interface.  It should display a rocket similar to the one on the home page at the top center of it.  This should have a generous amount of space, because the alerts should be overlayed on top of it in the top left in a column.  These alerts should update from the Ship State.
Underneath the rocket, a smaller one-row section underneath with the game clock on the left, followed by vertical progress bars for the values from the Ship State;  Hull Damage, Oxygen Levels, Fuel Levels, Battery Power.  Each Ship State value can either be increasing, decreasing, or standing still at any point in time (which will be determined from the Ship State), and there should be between zero and three chevrons overlaid over each progress bar to show if it is changing, and an approximation of how much it is changing by.

3.b. Ship Manual
The ship manual should look like a notebook with some pages of text on it.  It should have two 'curled edges', one on the bottom left, and one on the bottom right.  The current page and the total pages should be shown in the bottom center. If the user clicks on the bottom left, it should go one page back.  If the user clicks on the bottom right, it should advance one page forward.  Make sure the page contents are defined in a way that I can easily view and edit them.  Start with 4 pages of placeholder text so I can test that the system is working.

4.c. Stations
The stations section should have a series of tabs across the top that lets the player change which station they are looking at.  Each player will have different stations available to them, and I will be changing them so make sure which stations are available to which player is configurable.  The station tabs should have a boxy look to them, and if there are too many to fit on one row, they should overflow to the next row with blank space to fill out the line.

We will start with 4 stations; Engineering, Navigation, Weapons, and Science.
Each station should be its own component that has access to the Ship State so it can send actions to it, but each station should also have its own redux store to keep track of the station state.  Each station's state should be preserved when the user changes tabs to another station.

4.c.i: Engineering
  The engineering station should consist of 4 engineering panels.  Each panel has a name ("A1b2", "Xy9Z", "3Fp7", "Q8wS"), and the order of the panels should be randomized at the start of the game in the GameState.

	The background of the engineering station should be a grey metallic colour, and each panel should start off closed.  A closed panel should have a lighter gray outline, one circular 'screw' in each corner, and the panel's name centered inside of the panel in a darker gray colour.
	When the user clicks on a panel, all other open panels should be closed, that panel should open up.  The currently open panel should be stored in the Engineering component's local state, not the GameState.
	The station store for engineering will track the state of each wire connection for each panel.  Each panel will have 4 inputs (which will be rendered as coloured circles on the leftmost column, with the text "IN" at the bottom), 4 center nodes (which will be rendered four coloured circles in the centermost column) and 4 output nodes (which will be rendered as four coloured circles in the rightmost column).  An input may or may not be connected to a same or differently coloured node, which may or may not be connected to a same or differently coloured output.
	The state of the nodes at the start of the game is considered the "correct" state for that station, and should be stored as the correct state at the start of the game.  This correct state should be hardcoded at the start of the game, and every input should be connected to a node, which should be connected to an output at this point.
	When a panel is open, the inputs, nodes, and outputs should be rendered as described above, and each wire connection should be rendered as well.
	If the user hovers over a wire, it should highlight with a yellow outline.  If the user clicks on a wire, it should remove that connection.
	If the user click and drags on an input, a node, or an output, a wire should be rendered from the clicked on target, to the mouse cursor, and the clicked on target should be stored.  When the user stops dragging, the connection should be made, and the game state should be updated accordingly.
	If some external event causes the connections to change, the UI should update instantly.  This will most likely happen due to an alert being created.

4.c.ii: Weapons
	The Weapons system should have a canvas in the middle which will render any incoming asteroids or other threats.  It should also have three buttons along the bottom, one red, one blue, and one green which are labelled 'Phasers', 'Missiles', and 'Railgun'.  Each weapon should have a consistent colour associated with it.
	Each weapon can be damaged as a result of other systems on the ship being damaged.  For now, write a placeholder function called "isWeapon<WeaponName>Functional" in weaponStore that always returns true to check if each weapon is functional.  It will need to reference stationStore, and possibly other stores such as engineeringStore, so add in the variables that we'll need to fetch data from those stores, but leave them commented out for now.
	Create a weaponsStore that lives beside "engineeringStore" which tracks what threats are currently active, the status of those threats, and the cooldown of each weapon.
	The only threat that we will currently implement is going to be asteroids, but make sure that any code you write is generic enough to allow for future threats to be added in.
	An asteroid will be composed of somewhere between three and five layers.  Each layer can be made of one of three different materials.  Each material is weak to either Phasers, Missiles, or Railguns, and should be colour coded to match the weapon.  Asteroids will also have a 'time created', and a 'impact time', both of which are expressed in units based on GameMinutes and GameSeconds (see ShipState['gameClock']).
	When the user presses a weapon's button, it should search through the threats to find the asteroid with the least time remaining until impact who's outermost layer's weakness is the weapon.  If no such asteroid is found, then the weapon should go on cooldown for 3 seconds.  If such an asteroid is found, its outermost layer should be destroyed, and a short (200ms) animation should play where an appropriately coloured laser-line is rendered from the bottom center of the canvas to the center of the asteroids, at which point the weapon should go on cooldown for 1 second.
	Each asteroid should be rendered in the weapon canvas as an 8-sided solid white regular polyhedron with concentric outlines for each layer of defense it has left, coloured according to its material. The astroid should be given a random position that keeps it fully contained inside the canvas, and it should be a random size from 40-80px, influenced by the number of layers it started with.  The size and position should be stored in the Asteroid state in weaponStore.
	The DungeonMaster will occasionally have events that will spawn asteroids.  Create a helper function to do this, and for now, call it three times at the start of the game so I can test the functionality


4.c.iii: For each of the other stations, when the user views a station, draw a canvas and render the name of the station in the center of it.

5. Alerts
Alerts are the challenges that the ship encounters, which the players will need to solve.
Each alert should have the following fields;
Name.  The name of the alert
Timestamp.  The GameMinute & GameSecond that the alert started at.
Description.  A longer description of the alert.
Severity.  "Warning", "Danger", and "Critical".
Owner.  The player who is the primary driver for this alert.
System Effects.  Each alert will cause a change over time to one or more systems.  Every 10 game minutes that pass, the alert will apply its effects to the game state.  This should be done by giving the alert an "apply effects" method, which the Dungeon Master will call during its update cycle.

Finally, each alert will also have a "resolution" check, where it checks the status of each subsystem to determine if the alert has been resolved.

6. Dungeon Master
I want to have a Dungeon Master that can update the Ship State and add alerts, modify Ship State, and modify each station state.
The Dungeon Master will also have a game loop.  Inside the game loop, every one second in the real world will add one GameSecond to the Ship State clock, and every 60 GameSeconds should update the GameMinutes as expected of a normal clock.
After 15 GameSeconds of play time, the Dungeon Master should add a warning-level alert to the Ship State.
After 30 GameSeconds of play time, the Dungeon Master should add a second, critical-level alert to the Ship State.
Finally, after 60 GameSeconds of play time, the Dungeon Master should add a third danger-level alert to the Ship State.
For now, use placeholders for these alerts

Every 10 GameMinutes, each active alert's "apply effects" method should be called so they can update the game state