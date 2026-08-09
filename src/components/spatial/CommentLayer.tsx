// CAD-upgrade Gap 7: renders unresolved Comments as pins on the plan — closes the
// "panel-only, not a canvas pin" gap stated in the commit that added the Comment
// entity. Resolved comments aren't shown (CommentsPanel's collapsed "resolved"
// section is where those live) — a pin's whole purpose is drawing attention to an
// open item. Read-only view over store data, same pattern as every other *Layer.tsx.
'use client';

import { Fragment } from 'react';
import { Circle, Text } from 'react-konva';
import type { Comment } from '@/lib/spatial/types.ts';

type Props = {
  comments: Comment[];
  pxPerM: number;
};

export default function CommentLayer({ comments, pxPerM }: Props) {
  return (
    <>
      {comments
        .filter((c) => !c.resolved)
        .map((c) => (
          <Fragment key={c.id}>
            <Circle x={c.x * pxPerM} y={c.y * pxPerM} radius={7} fill="#f59e0b" stroke="#92400e" strokeWidth={1.5} listening={false} />
            <Text
              x={c.x * pxPerM - 3}
              y={c.y * pxPerM - 6}
              text="!"
              fontSize={11}
              fontStyle="bold"
              fill="#ffffff"
              listening={false}
            />
            <Text x={c.x * pxPerM + 10} y={c.y * pxPerM - 8} text={c.text} fontSize={11} fill="#92400e" listening={false} />
          </Fragment>
        ))}
    </>
  );
}
