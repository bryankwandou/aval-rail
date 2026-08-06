import React from 'react';
import { Composition } from 'remotion';
import { Demo } from './Demo';
import { Cut, TOTAL } from './Cut';
import { FPS, TOTAL_SECONDS } from './beats';

export const RemotionRoot: React.FC = () => (
  <>
    {/* The re-cut: 80 seconds, five layouts, the product on screen. */}
    <Composition id="AvalCut" component={Cut} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />

    {/* The long evidence replay, kept for the write-up rather than the showcase. */}
    <Composition
      id="AvalDemo"
      component={Demo}
      durationInFrames={TOTAL_SECONDS * FPS}
      fps={FPS}
      width={1920}
      height={1080}
    />
  </>
);
