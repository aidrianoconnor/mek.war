# mek.war
Old school robot wars in a turn-based hex-map game, based very loosely on Battletech and similar tabletop games.  Core features include the ability to build your own units of various types, configurable / savable game maps, and terrain and map features that affect movement speed, chance to hit, and line of sight.

## Installation

mek.war is a standalone HTML / JS application.  In order to be able to load initial game data (maps, pre-configured teams, etc) it does require being run in either a local web server (localhost) or on an external web server, however, there are no real requirements of the server being that it be able to serve HTML as the entire application after loading data is run client-side in the browser.  Once you have a location to host the files, update the following line at the top of app.js to indicate the URL that points to the folder containing index.html:

static webroot = 'http://localhost/mekwar/gitroot';


## Game Setup

Each individual game has an assigned number of players (teams) and a max number of tonnage (weight) per team.  You must then select the desired map to use, and have the option of either using pre-configured teams (all teams are assigned matching units, ie all players get the same setup), or players can be allowed to build their own teams (by not checking the "Use Pre-Configured Teams" checkbox).  Number of teams for a game cannot exceed the number of placement / deployment areas that have been created for the selected map (currently not enforced by application logic, but a max teams property of a map is desirable, and perhaps can just be extraced from the related placement map).

## Team Building / Saving Pre-Configured Teams

If pre-configured teams are not used, players can build out their team by creating units after hitting Save on the Game Setup screen.  Each team is worked through in succession.  Individual unit weight is calculated based off of selected Reactor Type, Chassis Type, Weapons and Armor (discussed further below).  Total weight of all units is deducted from the team Max Tonnage assigned to the game on the Game Setup screen, and cannot exceed that number.

Individual units and the entire team can be saved to utilize in the "Use Pre-Configured Teams" option on the Game Setup screen.  Clicking either "Output Team Config" or "Output Unit Config" on the Team Setup screen will write a JSON object out to the developer console, which can then be copy/pasted into a .json file in the data/teamConfigs folder.  The filename must then be manually added to the UI in the drawGameSetup() method of UI.js to make it available for selection during game setup.

## Map Building / Saving Maps

A map builder has been created that allows you to visually buid maps by selecting terrain and features and clicking on map hexes to assign them.  You can also create deployment zones for each team, which indicate what hexes teams are allowed to place their units on at the start of the game.  Map data is saved by writing terrain, feature and placement maps out to the developer console as a JSON object, which is then copy / pasted into .json files in the related folders in the data folder.  The three types of maps for each overall game map must have the same filename.  The core filename must then be added to drawGameSetup() in UI.js to make it available to select during the Game Setup phase.

## Units

### Chassis Types
At time of writing there are three types of units, denoted by "Chassis Type" - Vehicle, Tank and Mech.  Vehicles are assumed to be wheeled, Tanks are assumed to have tracks, and Mechs are assumed to have legs.  Chassis Type directly affects speed (max distance travelable per turn, translated into "move points"), and each terrain type has modifiers that affect the same on a per-chassis-type basis.  Wheeled vehicles have a +2 modifier to max speed, tanks +1, and mechs 0.  Generally speaking vehicles are much more susceptible to being impacted by terrain, tanks somewhat, and mechs less so.  As an example, Pavement terrain will actually increase vehicles' and tanks' move points, whereas Shallow or Deep Water will block them completely.  Various other terrain types will effectively slow down vehicles, and less so tanks, while not impeding mechs at all.  Thus there is a tradeoff between selecting a unit that can be very fast, but only on the right terrain, versus units that are not as fast but can adapt to all or most terrains.  Chassis Types impact unit weight, with Vehicle chassis being comparable light, Mechs being heavy, and tanks falling between.

### Reactor Types
Reactor Type determines the overall Power that a given unit has, are are split into four categories - Light, Medium, Heavy, and Assault.  Power is a core constituent in the calculation that determines final Speed for a unit.  Put simply, the total weight (tonnage) divided by the unit's Power, plus the Chassis Type Speed Modifier, determines final Speed (and thus Move Points per turn) for the unit.  As an example, one could create a unit with a very large Reactor Type and very little additional weapons and armor to make a unit that can travel very far per turn, or one could create a unit with a small reactor and lots of weapons and armor that can barely move at all.  The larger the Reactor Type the more tonnage it will add to the unit, so there are clear trade-offs here.

### Weapons
Weapons have many factors, but to summarize:
- Category: currently Ballistic, Missle, and Laser.  No game mechanic impacts at current time, but this may be changed in future
- Min and Max Range: number of hexes away an enemy can be attacked with this weapon
- Rounds: number of projectiles fired per-attack.  Translates into number of to-hit rolls per attack.  Example: a laser has a single "round" meaning one attempt to hit per attack, whereas a missle system might have as many as 20.
- Damage: per-round max damage
- To Hit: factor affecting how easy it is to successfully hit per-round.  Some weapons are quite accurate (80%) and others are not (50%)
- To Hit Modifier: simply put, accuracy over distance.  Weapon accuracy degrades by different factors per-hex of distance out to max range.  Some weapons will be quite accurate up-close put quite poor at longer ranges.  Some barely degrade over distance.
- Ammunition: total number of rounds available for this weapon in this game.  Note this is number of rounds, not number of attacks, meaning a weapon that fires 20 rounds and has 100 ammo can only be fired five times in the game before it is useless.
- Fire Cost: number of Attack Points required to fire this weapon.  Note that some weapons have very low Fire Cost, allowing them to be fired more than once in a given turn, and some are very expensive, requiring the player to convert Move Points to Attack Points to be fired at all (more on this below).
- Weight: tons of weight that the weapon system adds to the unit, thus affecting speed.

As can be noted above, there are many factors affecting overall weapon ability to hit.  To summarize, each indvidual round has an overall chance to hit, which is then modified by the distance to target.  Once a successful hit occurs, final damage is calculated against the max damage per round.  At time of writing, Cover has not yet been implemented, but Cover from the Terrain, Feature, or both, that the target is standing on will also degrade ability to hit per-round.

All weapon types have been run through a balancing process to try to make all roughly equal in their effectiveness.  Balancing factored in weight, rounds, to hit, to hit modifier, damage per round, etc.

### Armor
Armor is simply tons of protective armor that is added to unit, directly increasing the unit's Health Points (and weight, thus affecting Speed).  One tone of armor translates to 10 HP.  All units start with only 10 Health Points, meaning players will most definitely want to add Armor to all units.

### Attack Points, and Converting Move Points to Attack Points
All units receive 2 Attack Points per turn, and each weapon can only be fired once per turn.  Small weapons like the MiniGun only cost 1 AP to fire, but the only way you would be able to fire MiniGuns twice in a given turn would be to mount two MiniGuns on your unit.

Note that 50% of total (not remaining) Move Points can be converted into one Attack Point.  By example, a player whose unit has 6 MP could move 3 hexes and then convert the remaining 3 MP to a single additional Attack Point.  If that unit moved 4 hexes they would not be able to convert the remaining 2 MP to an Attack Point because they do not have 50% of their total MP per turn remaining.  If the unit is not moved at all, two additional Attack Points could be generated by coverting all of their Move Points.  Some large and powerful weapons require as much as 4 AP to fire - meaning there is no way to fire them unless you do not move the unit at all within a given turn.

## Terrain

Terrain refers to the base terrain of a given hex.  Examples include Grass, Light Forest, Deep Water and Pavement.  As noted above in Units, terrain affects the movement rate of different unit types (Vehicle / Tank / Mech) individually, and can have the effect of slowing them down, speeding them up, or blocking movement completely.  Terrain can also affect Line of Sight, detailed below, as well as (not yet implemented) add Cover to make units standing on the terrain harder to hit (ex: Deep Forest).

## Features

Features represent the idea of anything permanent that sits on top of the Terrain.  Examples would include Walls, Buildings, etc.  At time of writing, only Walls have been implemented.  As with Terrain, Features can affect Movement, Line of Sight, detailed below, as well as (not yet implemented) add Cover to make units standing on the terrain harder to hit.

## Line of Sight

Line of Sight is simply the notion of if one unit is capable of seeing another.  In this game, if you have LOS to an enemy unit and it is within range, you can attack it.  If any friendly unit can see an enemy unit, all friendly units will be able to see it, although you must have direct LOS in order to be able to attack it.  Conversely, if no friendly unit can see an enemy unit that unit will not appear on the map during your turn.

Note that LOS on a hexagonal map can be very hard to calculate.  The approach that has been used here is to mathmatically draw a line between the center of the attacker's hex to the center of the attackee's hex using the X,Y coordinates of the two hexes.  The line is then cut into multiple segments, with a small circle drawn at the end of each segment.  All other hexes are then encircled (fully circumscribed) with circles, and if there is any overlap between the small segment circles and the larger hex-enclosing circles that those hexes are considered when calculating final Line of Sight.  This can occasionally result in LOS being blocked when the human mind might think it should not be, but this grey area is simply unavoidable and must be taken as "you can almost see the unit well enough to target it, but not quite."

Terrain and Features block LOS by a percentage, ie, Light Forest might block 25% of LOS.  The total LOS blocked is added up for each hex that is considered to affect LOS between the start and end hex, and once that total reaches 100% LOS is considered blocked.  In other words, you could see (and attack) a unit standing on the other side of three Light Forest hexes, but if there were four you could not.

An early attempt to have units block line of sight was attempted, but the results were annoying and not great.  At time of writing, units to not block LOS.

## Game Balance

Until the game has been played more often it is hard to estimate how well the game has been balanced.  As noted above, an attempt has been made to balance weapons against each other, but even in that case only playing the game a lot will surface if any of the many factors of speed and weapon, with all of the associated modifiers and effects of terrain / feature, are well-balanced or create certain combinations or configurations that are over-powered.  Can a very fast vehicle with a single weapon system repeatedly perform hit-and-runs and never be hit?  Can a single massive mech with huge armor be effectively unkillable?  Only playing the game will let us know.  Ongoing tweaks to various weights and properties will likely need to occur as the game continues to be developed.

## Implementation / Technology

In its current form the game is simply a big JavaScript application that runs in a single HTML page.  View state is stored and the entire UI is regularly trashed and recreated entirely via a core update() function in UI.js whenever state is updated.  In a future iteration the entire UI may be stripped out and replaced with React.  At time of writing all graphic elements are dynamically rendered canvas elements containing HTML5 drawing methods.  As the graphics are developed, SVGs may replace or be added to map hex types and units.

In terms of data and logic, a JavaScript class-based approach has been used throughout, though note that this is my personal take on using JS classes, and others with more knowledge and experience might have thoughts of "wow, that's really not how you do that." Suffice to say this is just a fun little side project for me, and as such have approached it with a goal-oriented, "don't let the perfect be the enemy of the good" mentality.  I certainly do not enforce any type of "classes can't have awareness of other classes' methods" type rules, mainly because I just don't care quite that much.  Thus far the approach I've used works quite well for me, though I am interested to see if memory and UI refresh speeds suffer as bigger games with larger complex maps and many units are played.

JQuery has also been utilized, once again because it is just fast and easy for me to implement.


## List of Future / Missing Game Features
- graphics for units, terrain, map features
- sound effects for weapon attacks, including miss
- cover granted to units standing on hexes with given terrain / features
- line of sight required to attack, ie, if an enemy is visible to a friendly unit certain weapons could allow attack even if that unit does not have direct LOS to the enemy (ex: missles)
- game playable with teams on separate devices, ie game server, database, sharable state, playback of previous team's actions during their turn
- destructable map features?
- AI-controlled enemy teams