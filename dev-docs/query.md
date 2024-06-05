# Reactions

## Problem

When presented with a feed of notes, either a timeline (social) or a live chat log (live stream chat)
how do you fetch the reactions to such notes and maintain realtime updates.

## Current solution

When a list of reactions is requested we use the expensive `buildDiff` operation to compute a
list of new (added) filters and send them to relays.

Usually if `leaveOpen` is specified (as it should be for realtime updates) this new trace will be sent
as a separate subscription causing exhasution.

Another side effect of this this approach is that over time (especially in live chat) the number of filters that get passed to `buildDiff` increases and so the computation time takes longer and causes jank (https://git.v0l.io/Kieran/zap.stream/issues/126).

There is also the question of updating the "root" query, since this is not updated, each independant query trace receives its own set of updates which is a problem of its own.

## Proposed solution (Live chat)

The ideal solution is to update only the "root" query as new filters are detected along with appending the current timestamp as the `since` value.

In this way only 1 subscription is maintained, the "root" query trace.

Each time a new set of filters is created from `buildDiff` we push the same `REQ` again with the new filters which **should** result in no new results from the relays as we expect there to be none `since` the current time is the time of the latest message.

## Proposed solution (Timeline)

TBD
