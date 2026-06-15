function splitArch(count) {
  return {
    left: Math.ceil(count / 2),
    right: Math.floor(count / 2)
  };
}

function oppositeJaw(jaw) {
  return jaw === "top" ? "bottom" : "top";
}

function oppositeSurface(surface) {
  return surface === "front" ? "back" : "front";
}

function parseStartSegmentKey(startSegmentKey) {
  const match = String(startSegmentKey || "").match(/^(front|back)-(top|bottom)-(left|right)$/);
  if (!match) {
    return null;
  }

  return {
    surface: match[1],
    jaw: match[2],
    side: match[3]
  };
}

function buildHalfIndices(totalTeeth, side, direction) {
  const split = splitArch(totalTeeth);
  const base = side === "left"
    ? Array.from({ length: split.left }, (_, index) => index)
    : Array.from({ length: split.right }, (_, index) => split.left + index);

  return direction === "ltr" ? base : [...base].reverse();
}

function buildSegment({ surface, jaw, side, totalTeeth, direction }) {
  const mapIndices = buildHalfIndices(totalTeeth, side, direction);
  if (!mapIndices.length) {
    return null;
  }

  const surfaceLabel = surface === "front" ? "Front" : "Back";
  const jawLabel = jaw === "top" ? "Top" : "Bottom";
  const sideLabel = side === "left" ? "Left" : "Right";

  return {
    key: `${surface}-${jaw}-${side}`,
    label: `${surfaceLabel} ${jawLabel} ${sideLabel}`,
    jaw,
    surface,
    mapIndices
  };
}

function buildRowSegments({ jaw, surface, direction, totalTeeth }) {
  const sideOrder = direction === "ltr" ? ["left", "right"] : ["right", "left"];
  return sideOrder
    .map((side) => buildSegment({ surface, jaw, side, totalTeeth, direction }))
    .filter(Boolean);
}

export function buildSegments(topTeeth, bottomTeeth, startSegmentKey = null) {
  const parsedStart = parseStartSegmentKey(startSegmentKey) || {
    surface: "front",
    jaw: "top",
    side: "left"
  };
  const preferredDirection = parsedStart.side === "left" ? "ltr" : "rtl";
  const mirroredDirection = preferredDirection === "ltr" ? "rtl" : "ltr";
  const jawOrder = [parsedStart.jaw, oppositeJaw(parsedStart.jaw)];
  const orderedSegments = [];

  jawOrder.forEach((jaw) => {
    const totalTeeth = jaw === "top" ? Number(topTeeth || 0) : Number(bottomTeeth || 0);

    orderedSegments.push(
      ...buildRowSegments({
        jaw,
        surface: parsedStart.surface,
        direction: preferredDirection,
        totalTeeth
      })
    );
    orderedSegments.push(
      ...buildRowSegments({
        jaw,
        surface: oppositeSurface(parsedStart.surface),
        direction: mirroredDirection,
        totalTeeth
      })
    );
  });

  return orderedSegments;
}

function buildTransitionPrompt(order, transitionCount, transitionBufferSeconds) {
  if (order === 1 || order === transitionCount) {
    return {
      cue: "switchHand",
      seconds: 1
    };
  }

  if (order === 2 || order === 4) {
    return {
      cue: "rotate",
      seconds: 0.75
    };
  }

  return {
    cue: "transition",
    seconds: transitionBufferSeconds
  };
}

export function buildTimeline(segments, secondsPerTooth, transitionBufferSeconds) {
  const timeline = [];
  let cursor = 0;
  const transitionCount = Math.max(0, segments.length - 1);

  segments.forEach((segment, segmentIndex) => {
    segment.mapIndices.forEach((mapIndex, toothIndex) => {
      timeline.push({
        type: "tooth",
        key: `${segment.key}-${mapIndex}`,
        label: segment.label,
        jaw: segment.jaw,
        surface: segment.surface,
        mapIndex,
        segmentPosition: toothIndex + 1,
        segmentSize: segment.mapIndices.length,
        startsAt: cursor,
        endsAt: cursor + secondsPerTooth
      });
      cursor += secondsPerTooth;
    });

    if (segmentIndex < segments.length - 1) {
      const transitionOrder = segmentIndex + 1;
      const transitionPrompt = buildTransitionPrompt(transitionOrder, transitionCount, transitionBufferSeconds);

      timeline.push({
        type: "transition",
        key: `transition-${segment.key}`,
        fromLabel: segment.label,
        toLabel: segments[segmentIndex + 1].label,
        transitionOrder,
        transitionCue: transitionPrompt.cue,
        startsAt: cursor,
        endsAt: cursor + transitionPrompt.seconds
      });
      cursor += transitionPrompt.seconds;
    }
  });

  return timeline;
}

export function getActiveTimelineEntry(timeline, elapsedSeconds) {
  return timeline.find((entry) => elapsedSeconds >= entry.startsAt && elapsedSeconds < entry.endsAt) || null;
}

export function getActiveToothEntry(timeline, elapsedSeconds) {
  const entry = getActiveTimelineEntry(timeline, elapsedSeconds);
  return entry?.type === "tooth" ? entry : null;
}
