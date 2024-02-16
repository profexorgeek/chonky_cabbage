# Chonky Cabbage (aka Roadmaker)

![A silly picture of a round cabbage with a human face](cabbage.png)

Chonky Cabbage (CC hereafter) is a randomly-generated project name for my 2024 Script Jam contribution at Mojang.

CC builds configurable roads, bridges, tunnels, stairs, and railways.

A video of the first version of this is here:
https://youtu.be/qbY94TFNih4

## Usage

Once you add the CC Add-On, you can invoke commands from the Minecraft terminal.

CC will always start the command you specify on the block in front of the block you are standing on.

Here are a list of commands:

- `/scriptevent rd:help` - prints a list of commands
- `/scriptevent rd:cancel` - cancels an in-progress road (useful if it stalls out)
- `/scriptevent rd:road [length]` - builds a road at ***length**
- `/scriptevent rd:stairs_up [length]` - builds stairs upward at **length**
- `/scriptevent rd:stairs_down [length]` - builds stairs downward at **length**
- `/scriptevent rd:rail [length]` - builds a powered rail at **length**
- `/scriptevent rd:rail_up [length]` - builds rails upwards at **length**
- `/scriptevent rd:rail_down [length]` - builds rails downwards at **length**
- `/scriptevent rd:assign [blockType]=[minecraftBlock]` - customizes the road (see details below)

## Customizing Road Blocks

The `rd:assign` command allows you to customize the blocks used in the road. CC uses
these placeholder keywords for blocks:

- `Foundation`: the block used under stairs, side walls, and in tunnels
- `Wall`: the block used on each side of the road
- `Path`: the block used to pave the road pathway
- `Post`: the block used for lights on "fancy" slices
- `Light`: the block used for lights
- `Stair`: the block used for stairs

Customize which minecraft block is used by specifying a valid minecraft block type
in with the `rd:assign` command. For example, this would set the path to use birch planks:

`/scriptevent rd:assign Path=birch_planks`

## How it Works

The roadmaker steps through space in the direction the player is facing and uses 5x5
**slice** templates to define the slice of road created at each increment.

Blocks are given the following integer identifiers:

- 0:Air
- 1:Foundation
- 2:Wall
- 3:Path
- 4:Post
- 5:Light
- 6:Stair
- 7:Rail
- 8:Golden Rail
- 9:Redstone Torch

These identifiers allow you to create a road **slice** as a 5x5 grid. For example,
this grid would be a basic road slice with several layers of air, walls on each
side, and a path on the bottom:

```
00000
00000
00000
20002
13331
```

The `RoadMaker` class sets internal properties to track where it is in a road-building
queue. These properties are prefixed with `q` for **queue**. Each iteration tick, the
class will attempt to process the next chunk of slices in the queue. The number of slices
processed in each tick is defined by a private property called `SlicesPerTick`.

The `RoadMaker` resolves the player's view direction into 4 cardinal directions, expressed
as an integer where:

- 0: West
- 1: South
- 2: East
- 3: North

This integer is used to transform **slice** orientation when marching along a road.

## Build it

See the [Official Minecraft Add-On Documentation](https://learn.microsoft.com/en-us/minecraft/creator/documents/gettingstarted?view=minecraft-bedrock-stable&tabs=Windows10)
for information on how to build and load this add-on!