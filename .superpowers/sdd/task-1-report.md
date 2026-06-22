# Task 1 Report: emit gridBox + slotKeys

## Status: DONE

## gridBox (from regenerated rewards.ts)
```json
{"x":17,"y":615,"w":356,"h":382}
```
Fixed (task-3 bug fix): gridBox now matches the actual reward-grid sub-region (y=615, not screen root y=0). Fix: grid lookup now requires child `c.component.key === key` instead of any component child.

## slotKeys (from regenerated rewards.ts)
```json
["group","group2","amount","currency","group3","text3","requirement"]
```
Pre-order walk: group nodes appear before their children. 7 keys total (3 group + 4 text).

## Test Result
12/12 tests pass (was 11 before; new test added). `node --check` clean.

## Concerns
1. `gridBox = {x:0, y:0, w:390, h:2076}` — grid occupies the full screen. The emitter's grid detection picks the first layout node whose direct children include a component. For this Figma export, that is the outermost screen frame. The inspector's position controls will have y=0 as origin, which is correct.
2. `slotKeys` includes group keys (`group`, `group2`, `group3`) alongside text keys. The inspector should handle or filter groups if only text-slot position controls are needed.
3. Cards `1:33674` and `1:33678` share chromeImage with cards `1:33673` and `1:33677` respectively — this comes from the Figma export data, not introduced by this task.
