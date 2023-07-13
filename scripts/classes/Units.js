
class Reactor {
    constructor(name, power, weight) {
        this.name   = name;
        this.power  = power;
        this.weight = weight;
    }
}

class LightReactor extends Reactor {
    constructor() {
        super('Light', 50, 10);
    }
}
class MediumReactor extends Reactor {
    constructor() {
        super('Medium', 100, 20);
    }
}
class HeavyReactor extends Reactor {
    constructor() {
        super('Heavy', 150, 30);
    }
}
class AssaultReactor extends Reactor {
    constructor() {
        super('Assault', 200, 40);
    }
}


class Chassis {
    constructor(name, weight, speedMod) {
        this.name       = name;
        this.weight     = weight;
        this.speedMod   = speedMod;
    }
}

class VehicleChassis extends Chassis {
    constructor() {
        super('Vehicle', 10, 2);
    }
}
class TankChassis extends Chassis {
    constructor() {
        super('Tank', 20, 1);
    }
}
class MechChassis extends Chassis {
    constructor() {
        super('Mech', 30, 0);
    }
}


class Unit {

    constructor(team, chassis, reactor, armor, weapons) {
        this.id      = this.makeUUID();

        this.team    = team;    // storing this unit's team for easy reference
        this.chassis = chassis; // Chassis object
        this.reactor = reactor; // Reactor object
        this.armor   = armor;   // number, tons of armor / AP
        this.weapons = weapons; // array of Weapon objects

        this.movePoints = 0;
        this.attackPoints = 0;

        this.currentWeapon = 0; // index of selected weapon

        this.startingHealthPoints = this.calcStartingHealthPoints();
        this.healthPoints = this.startingHealthPoints;

        // MOVED TO UNITHEX
        //this.visible = false; // for Line of Sight... is this unit visible to the current team's units

        this.destroyed = false;
    }

    makeUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    getName() {
        if(this.destroyed) return '[DESTROYED]' + ' ' + this.reactor.name + ' ' + this.chassis.name;
        return this.reactor.name + ' ' + this.chassis.name; 
    }

    getWeight() {
        var i = 0, weaponWeight = 0;
        for(i=0; i<this.weapons.length; i++) weaponWeight += this.weapons[i].weight;
        return this.reactor.weight + this.chassis.weight + this.armor + weaponWeight;
    }

    getSpeed() {
        return Math.floor(10 - ((this.getWeight() / this.reactor.power) * 10)) + this.chassis.speedMod;
    }

    calcStartingHealthPoints() {
        return 10 + (this.armor * 10);
    }

    getWeaponTypeCount(name) {
        var i = 0, cnt = 0;
        for(i; i < this.weapons.length; i++) {
            if(this.weapons[i].name == name) cnt++;
        }
        return cnt;
    }

    spendMovePoints(points) {
        this.movePoints -= points;
    }

    attack(targetMapUnit) {
        //console.log('target', targetMapUnit);
        const weapon = this.weapons[this.currentWeapon];
        const dmgAR = [];
        
        if(weapon.ammo > 0) {
            let rndCnt = weapon.rounds;
            const thisMapUnit = app.maps.units.getUnitByID(this.id).obj;            
            const distance = app.maps.paths.distance({r:thisMapUnit.r, c:thisMapUnit.c}, {r:targetMapUnit.r, c:targetMapUnit.c});
            const toHit = weapon.toHit - (distance * weapon.toHitMod);
            //console.log(weapon.toHit, distance, weapon.toHitMod, toHit);
            while (rndCnt > 0 && !targetMapUnit.unit.destroyed) { // destroyed check bc previous round in this salvo might have destroyed the target
                let hitRoll = Math.random();
                //console.log(hitRoll, toHit);
                if(hitRoll <= toHit){
                    // if toHit is 95 or higher this is a critical hit.  full weapon dmg is applied.  otherwise, random dmg
                    let dmg = (hitRoll < .95) ? Math.ceil(Math.random() * weapon.dmg) : weapon.dmg; 
                    targetMapUnit.unit.takeDamage(dmg);
                    dmgAR.push(dmg);
                } else {
                    //console.log('rnd '+rndCnt+' missed');
                    dmgAR.push(0);
                }
                rndCnt--;
            }
            weapon.ammo -= ((weapon.ammo != App.INF) ? weapon.rounds : 0);
            this.attackPoints -= weapon.fireCost;
            weapon.fired = true;
            this.currentWeapon = false;
            return dmgAR; // returns damage array (one item per hit) so UI can render them
        }

    }

    takeDamage(dmg) {
        this.healthPoints -= dmg;
        //console.log(this.id + 'unit taking ' + dmg + ' damage, new HP:' + this.healthPoints);
        if(this.healthPoints <= 0) {
            this.destroy();
        }
    }

    destroy() {
        console.log(this.id + ' unit destroyed!');
        this.destroyed = true;
        this.healthPoints = 0;
        this.movePoints = 0;
        this.attackPoints = 0;
        for(let i in this.weapons) this.weapons[i].ammo = 0;
        let destroyedMapUnit = app.maps.units.getUnitByID(this.id);
        if(destroyedMapUnit) app.maps.units.removeItem(destroyedMapUnit.index);
    }

    convertMPtoAP() {
        // if remaining move points are greater than half of speed, subtract have of speed from MP and add 1 to AP
        console.log(this.movePoints, this.getSpeed() * .5);
        if(this.movePoints >= this.getSpeed() * .5) {
            this.movePoints -= this.getSpeed() * .5;
            this.attackPoints++;
        } else {
            alert('You must have at least half of your maximum Move Points remaining');
        }
    }

}

class Units {
    
    static reactorFactory = {
        LightReactor   : function() { return new LightReactor() },
        MediumReactor  : function() { return new MediumReactor() },
        HeavyReactor   : function() { return new HeavyReactor() },
        AssaultReactor : function() { return new AssaultReactor() }
    }

    static chassisFactory = {
        VehicleChassis : function() { return new VehicleChassis},
        TankChassis    : function() { return new TankChassis },
        MechChassis    : function() { return new MechChassis }
    }

    // these keys match constructor.name of unit.chassis, and are used to look up the associated index in Hex moveCost arrays
    static moveCosts = {
        'VehicleChassis': 0,
        'TankChassis'   : 1,
        'MechChassis'   : 2        
    }

}
