

class Paths {

    constructor() {

    }

    // gets all hexes adjacent to this one, excluding any that would fall outside the map bounds
    // if returnHexObjs = true will return full Hex objects from map, otherwise just simple {r: X, c: Y} objects
    getNeighbors(hex, returnHexObjs) {
        const row = hex.r;
        const col = hex.c;
        const neighbors = [];
        var i;

        var calcsObj = {};

        calcsObj.n = { r: row-1, c: col };
        calcsObj.s = { r: row+1, c: col };
        calcsObj.nw = { r: (col % 2 === 0) ? row-1 : row, c: col-1 };
        calcsObj.ne = { r: (col % 2 === 0) ? row-1 : row, c: col+1 };
        calcsObj.sw = { r: (col % 2 === 0) ? row : row+1, c: col-1 };
        calcsObj.se = { r: (col % 2 === 0) ? row : row+1, c: col+1 };

        // only add to neightbors if coord values are within the bounds of the map (not less than r/c 0 or r/c > max row / column)
        for(i in calcsObj) {
            if(calcsObj[i].r > -1 && calcsObj[i].r < app.maps.mapRows && calcsObj[i].c > -1 && calcsObj[i].c < app.maps.mapCols) {
                neighbors.push(calcsObj[i]);
            }
            if(!returnHexObjs) return neighbors;
        }

        for(i in neighbors) neighbors[i] = app.maps.terrainMap.getHexByCoords(neighbors[i].r, neighbors[i].c);

        return neighbors;
    }

    // start is a hex object, range is the max distance from start to allow
    // if chassisType is not false the calcs will take into account move cost of hexes, otherwise assume cost of 1 per hex (used for weapon rangefinding)
    // chassisType should come through as the chassis object of the unit that is moving
    findWithinRange(start, range, minrange, chassisType) {
        //console.log('findWithinRange', start, range, chassisType);
        const openSet = [start];
        const closedSet = [];
        const inRangeSet = [];
        let moveCost = 1;
        start.d = 0;
        closedSet[start.id] = 0;

        while (openSet.length > 0) {
            let current = openSet[0];
            if (current.d+1 <= range) { // only consider adding neighbors of this hex if cheapest possible move there would be less than range
                let neighbors = this.getNeighbors(current, true);
                for(var n in neighbors) {
                    moveCost = (chassisType !== false) ? app.maps.getHexMoveCost(neighbors[n].r, neighbors[n].c, chassisType) : moveCost;
                    // if this neighbor hasn't been evaluated, or if moving there via the current hex would cost less than the previously evaluated route
                    if(closedSet[neighbors[n].id] == undefined || (closedSet[neighbors[n].id] && current.d + moveCost < closedSet[neighbors[n].id])) {
                        neighbors[n].d = current.d + moveCost;
                        closedSet[neighbors[n].id] = neighbors[n].d;
                        //console.log('d: ' + neighbors[n].d + ' range: ' + range + ' min: ' + minrange);
                        if(neighbors[n].d <= range) openSet.push(neighbors[n]);
                    }
                }
            }
            
            if(openSet[0].d >= minrange) inRangeSet.push(openSet[0]);
            openSet.shift();
        }

        return inRangeSet;

    }

    // for fast determination of ranges from start hex to all other hexes in the map.  not exact but fast and easy.  returns all hexes within approx range.
    // potentially useful for LOS / fog of war
    findWithinEuclidRange(start, range) {
        let r, c;
        const rlen = app.maps.mapRows;
        const clen = app.maps.mapCols;
        const inRange = [];
        range += .5; // funk to allow for alternating row offsets, givs roughly better results
        for(r=0; r < rlen; r++) {
            for(c=0; c < clen; c++) {
                if(this.distance(start, app.maps.terrainMap.grid[r][c]) <= range) {
                    inRange.push(app.maps.terrainMap.grid[r][c]);
                }
            }
        }
        return inRange;
    }


    // A-Star path finding between start and end points
    // start and end must both be Hex objects from the terrainMap
    // chassisType = true will take movement cost for the indicated chassisType (passed as index) into account, else assumes cost of 1 (weapon animation paths, maybe LOS)
    findPath(start, end, chassisType) {
        //console.log('findPath', start, end, chassisType);
        const openSet = [start];
        const closedSet = [];
        const cameFrom = {};

        const gScore = {};
        gScore[start.id] = 0;

        const fScore = {};
        fScore[start.id] = this.heuristic(start, end);

        while (openSet.length > 0) {
            let current = openSet[0];
            let currentIndex = 0;

            openSet.forEach((hex, index) => {
                if (fScore[hex.id] < fScore[current.id]) {
                    current = hex;
                    currentIndex = index;
                }
            });

            if (current.id === end.id) {
                let path = [current];
                let temp = current;
                let cost = 0;
                while (temp.id in cameFrom) {
                    path.push(cameFrom[temp.id]);
                    temp = cameFrom[temp.id];
                }
                path.pop(); // remove last item in list, which will be starting hex
                for(let i in path) {
                    //console.log('cost', path[i].r, path[i].c, app.maps.getHexMoveCost(path[i].r, path[i].c, chassisType));
                    cost += app.maps.getHexMoveCost(path[i].r, path[i].c, chassisType);
                }
                return {path: path.reverse(), cost: cost};
            }

            openSet.splice(currentIndex, 1);
            closedSet.push(current);

            const neighbors = this.getNeighbors(current, true);

            neighbors.forEach(neighbor => {
                if (closedSet.includes(neighbor)) {
                    return;
                }

                const tentativeGScore = gScore[current.id] + ((chassisType !== false) ? app.maps.getHexMoveCost(neighbor.r, neighbor.c, chassisType) : this.distance(current, neighbor));

                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= gScore[neighbor.id]) {
                    return;
                }

                cameFrom[neighbor.id] = current;
                gScore[neighbor.id] = tentativeGScore;
                fScore[neighbor.id] = gScore[neighbor.id] + this.heuristic(neighbor, end);
            });
        }

        return null;
    }

    // moveDistance(hex1, hex2) {

    // }

    distance(hex1, hex2) {
        const dx = Math.abs(hex1.c - hex2.c);
        const dy = Math.abs(hex1.r - hex2.r);
        return Math.sqrt(dx*dx + dy*dy);
    }

    heuristic(hex1, hex2) {
        const dx = Math.abs(hex1.c - hex2.c);
        const dy = Math.abs(hex1.r - hex2.r);
        return dx + dy;
    }


 
    // determines the coordinates of a point along a line that runs from x1, y1 to x2, y2 and accepts distance along the line as a parameter
    // line of sight depends on this
    getPointAlongLine(x1, y1, x2, y2, distance) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx*dx + dy*dy);
        const unitX = dx / length;
        const unitY = dy / length;
        const pointX = x1 + unitX * distance;
        const pointY = y1 + unitY * distance;
        return {x: pointX, y: pointY, length: length};
    }

    // returns a list of hexes between a start and end hex to determine Line of Sight
    // this determines point coordinates along a line between the center points of start hex and the end hex
    // then figures out what hexes those points touch, and returns the list of all touched hexes
    // note that the radius assumed for hexes is a 'circumsphere' so there is intentional overlap of hex circles in the center of their edges
    // in edge cases this might result in blocked LOS when it seems like it should not be blocked, but thems the breaks... a hex that blocks LOS simply bleeds out a little into adjacent hexes
    getLOShexes(hex1, hex2) {
        
        // const hex1 = app.maps.terrainMap.grid[r1][c1];
        // const hex2 = app.maps.terrainMap.grid[r2][c2];

        //console.log(hex1.cx +','+ hex1.cy, hex2.cx+','+hex2.cy)

        // inital point just establishes line length for follow-on calculations
        let point = this.getPointAlongLine(hex1.cx, hex1.cy, hex2.cx, hex2.cy, 0);
        //console.log('point', point);

        let step = (app.maps.scaleUnit * .5); // distance along line that points should be plotted to test for intersection with hexes
        let pointCnt = point.length / step;
        //console.log('pointCnt', pointCnt);

        let r, c, hex;
        const grid = app.maps.terrainMap.grid;
        const rlen = grid.length;
        const clen = grid[0].length;

        const hexRadius = app.maps.scaleUnit * .5; // center point to vertex of map hexagons (ie, circumsphere of hexagon)
        const pointRadius = .5; // our collision points along the line are 1px wide

        const returnList = [];

        
        for(var i = 1; i <= pointCnt; i++) {
            point = this.getPointAlongLine(hex1.cx, hex1.cy, hex2.cx, hex2.cy, i * step);

            // CURRENTLY CHECKING AGAINST ALL HEXES IN TERRAIN MAP!  REDUCE THE SEARCH SET!
            
            for(r=0; r < rlen; r++) {
                for(c=0; c < clen; c++) {
                    if(!returnList.find(el => el.r == r && el.c == c)) { // dont reparse if hex already in returnList
                        hex = grid[r][c];
                        let distX = point.x - hex.cx;
                        let distY = point.y - hex.cy;
                        let distance = Math.sqrt( (distX*distX) + (distY*distY) );
                        // pointRadius is radius of our dots along the path, hexRadius is the radius of a map hexagon
                        if (distance <= pointRadius + hexRadius) { 
                            returnList.push({r: r, c: c});
                        }
                    }
                }

            }
        
        }

        return returnList;
    }

    // for each unit on the current team check to see if they have Line of Sight to any unit on the other teams
    applyTeamLOS() {

        //console.log('applyTeamLOS');
        
        let losHexes, h, uh, fu, eu, vis;

        // split the unithexes into two arrays of friendly units (ie on current team) and enemy units (not on current team)
        // also sets friend units to be visible and enemy units to be not visible by default
        const friendUnits = [];
        const enemyUnits = [];
        for(uh in app.maps.units.list) {
            if(app.maps.units.list[uh].unit.team != app.game.currentTeam) {
                app.maps.units.list[uh].visible = false;
                enemyUnits.push(app.maps.units.list[uh]);
            } else {
                app.maps.units.list[uh].visible = true;
                friendUnits.push(app.maps.units.list[uh]);
            }
        }

        for(fu in friendUnits) {
            for(eu in enemyUnits) {
                //console.log('friendUnit, enemyUnit', friendUnits[fu], enemyUnits[eu]);

                if(enemyUnits[eu].visible == false) { // only check enemy units that have not already been seen by other friend units    
                    losHexes = this.getLOShexes(friendUnits[fu], enemyUnits[eu]);  // returns the hexes that need to be tested for LOS
                    //console.log('losHexes', losHexes);

                    // start at target unit's hex, check its vis, then step backwards thru losHexes checking each hex to see if LOS is blocked
                    // once you get back to the start unit's hex (position 0 in array), if visibility still not blocked then set target unit's vis to true
                    // shound be able to just bail out as soon as visibility is blocked for this unit

                    vis = 1; // 100% visible.  this gets decremented by how much stuff between blocks LOS.  once 0, target unit cannot be seen
                    for(h=losHexes.length-1; h > -1; h--) { 
                        
                        // if terrain blocks LOS
                        if( app.maps.terrainMap.getHexByCoords(losHexes[h].r, losHexes[h].c) && 
                            !(losHexes[h].r == friendUnits[fu].r && losHexes[h].c == friendUnits[fu].c)) { // elimates hex viewer is standing on
                            //console.log('vis false bc of a feature at', losHexes[h].r, losHexes[h].c);
                            vis -= app.maps.terrainMap.getHexByCoords(losHexes[h].r, losHexes[h].c).blocksLOS;
                            //console.log('vis reduced by terrain at '+losHexes[h].r+','+losHexes[h].c+', now '+vis);
                            if(vis <= 0) {
                                h = -1; // bail out of loop - vis is blocked, no need to search further
                                continue;
                            }
                        }
                        
                        // if feature on this hex and it blocks LOS, or this hex is occupied and isn't the target enemy unit, LOS is blocked
                        //console.log('losHexes features', losHexes[h].r+','+losHexes[h].c, app.maps.featureMap.getItemByCoords(losHexes[h].r, losHexes[h].c));
                        if( app.maps.featureMap.getItemByCoords(losHexes[h].r, losHexes[h].c) &&
                            !(losHexes[h].r == friendUnits[fu].r && losHexes[h].c == friendUnits[fu].c)) { // elimates hex viewer is standing on
                                //console.log('vis false bc of a feature at', losHexes[h].r, losHexes[h].c);
                                vis -= app.maps.featureMap.getItemByCoords(losHexes[h].r, losHexes[h].c).obj.blocksLOS;
                                //console.log('vis reduced by feature at '+losHexes[h].r+','+losHexes[h].c+', now '+vis);
                                if(vis <= 0) {
                                    h = -1; // bail out of loop - vis is blocked, no need to search further
                                    continue;
                                }
                        }

                        /* SHUTTING THIS OFF FOR NOW - not loving how easy it is to have vis / attack blocked by hexes on vis path being occuppied
                            possible return to this if and when LOS is change to % drop instead of boolean/full block
                            also would want to add a param to this function to determine LOS vs ability to target, ie, check for unit visibility might
                            not be blocked, but check for ability to target with weapons could be */ 
                        // check to see if this hex is occupied, but not by either the viewer or the viewee
                        /*
                        if( !(losHexes[h].r == friendUnits[fu].r && losHexes[h].c == friendUnits[fu].c) &&
                            !(losHexes[h].r == enemyUnits[eu].r && losHexes[h].c == enemyUnits[eu].c)
                        ) { 
                            let occupier = app.maps.units.getItemByCoords(losHexes[h].r, losHexes[h].c);
                            console.log('occupier', occupier);
                            if(occupier) vis = false;
                        }
                        */
                        
                    }

                    if (vis > 0) {
                        enemyUnits[eu].visible = true;
                        //console.log('unit vis set to true', enemyUnits[eu]);
                    }

                } else { // temp else can remove after debug
                    //console.log('enemy unit is already visible, not tested for this friendly unit');
                }

            } // end for eu
        } // end for fu

    }


    

}




