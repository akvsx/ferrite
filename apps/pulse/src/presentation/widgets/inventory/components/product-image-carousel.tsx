'use client';

import { animate, motion, useMotionValue } from 'motion/react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/presentation/primitives/button';

export type CarouselImage = {
	id: string;
	default?: boolean;
	alt: string;
	src: string;
};

type ImageCarouselProps = {
	images: CarouselImage[];
};

/**
 * Width distribution relative to active index:
 *   ±2+  → 12%
 *   ±1   → 28%
 *    0   → 60%
 *
 * Track shifts via translateX. First image flush-left,
 * last image flush-right, middle items centred.
 */

const GAP = 14;
const SPRING = { type: 'spring' as const, damping: 32, stiffness: 260 };

function slotWidth(distance: number): number {
	if (distance === 0) return 60;
	if (distance === 1) return 28;
	return 12;
}

export default function ImageCarousel({ images }: ImageCarouselProps) {
	const orderedImages = useMemo(() => {
		if (!images || images.length === 0) return [];
		const arr = [...images];
		const defaultIdx = arr.findIndex((img) => img.default);
		if (defaultIdx > 0) {
			const [def] = arr.splice(defaultIdx, 1);
			arr.unshift(def);
		}
		return arr;
	}, [images]);

	const [activeIndex, setActiveIndex] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const trackX = useMotionValue(0);

	const count = orderedImages.length;

	/**
	 * Compute track offset so:
	 *   - idx 0         → offset = 0 (first image flush left)
	 *   - idx last      → offset clamps so last image is flush right
	 *   - middle items  → active item centred in viewport
	 */
	const computeOffset = useCallback(
		(idx: number) => {
			const el = containerRef.current;
			if (!el || count === 0) return 0;
			const cw = el.offsetWidth;

			// Item widths as pixels for the given active index
			const itemW = (i: number) => (slotWidth(Math.abs(i - idx)) / 100) * cw;

			// Total track width
			let totalW = 0;
			for (let i = 0; i < count; i++) {
				totalW += itemW(i) + (i < count - 1 ? GAP : 0);
			}

			// Sum of items before active
			let sumBefore = 0;
			for (let i = 0; i < idx; i++) {
				sumBefore += itemW(i) + GAP;
			}

			// Centre the active item
			const activeW = itemW(idx);
			let offset = -sumBefore + (cw - activeW) / 2;

			// Clamp: first image flush left (offset ≤ 0)
			offset = Math.min(0, offset);

			// Clamp: last image flush right (track end aligns with container end)
			const minOffset = -(totalW - cw);
			if (totalW > cw) {
				offset = Math.max(minOffset, offset);
			}

			return offset;
		},
		[count]
	);

	// Animate track when activeIndex changes
	useEffect(() => {
		const offset = computeOffset(activeIndex);
		animate(trackX, offset, SPRING);
	}, [activeIndex, computeOffset, trackX]);

	return (
		<section className="w-full flex flex-col items-center gap-6 py-4">
			{/* Viewport — clips overflow */}
			<div
				ref={containerRef}
				className="relative w-full max-w-5xl h-100 overflow-hidden"
			>
				{/* Inner track — shifts via translateX */}
				<motion.div
					className="flex h-full will-change-transform"
					style={{ gap: GAP, x: trackX }}
				>
					{orderedImages.map((image, index) => {
						const distance = Math.abs(index - activeIndex);
						const wp = slotWidth(distance);

						return (
							<motion.div
								key={image.id}
								className="relative flex-none overflow-hidden rounded-container bg-neutral-800 select-none cursor-pointer"
								animate={{
									width: `calc(${wp}% - ${GAP}px)`,
									opacity: distance > 2 ? 0.4 : 1,
								}}
								transition={SPRING}
								onClick={() => setActiveIndex(index)}
							>
								{/* Image wrapper — scales to 1.1 when active, no hover scaling, animated with SPRING */}
								<motion.div
									className="absolute inset-0 origin-center"
									animate={{ scale: distance === 0 ? 1.05 : 1.0 }}
									transition={SPRING}
								>
									<Image
										src={image.src}
										alt={image.alt}
										fill
										className="object-cover pointer-events-none"
										sizes="(max-width: 1024px) 100vw, 50vw"
										priority={distance === 0}
										draggable={false}
									/>
								</motion.div>
							</motion.div>
						);
					})}
				</motion.div>
			</div>

			{/* Dot indicators */}
			<div className="flex gap-2 mt-4">
				{orderedImages.map((_, index) => (
					<Button
						unstyled
						// biome-ignore lint/suspicious/noArrayIndexKey: index is the only available identifier
						key={index}
						onClick={() => setActiveIndex(index)}
						aria-label={`Go to image ${index + 1}`}
						className={`h-1.5 rounded-full transition-all duration-300 ease-in-out ${
							index === activeIndex ? 'w-8 bg-slate-500' : 'w-4 bg-[#3a3a40]'
						}`}
					/>
				))}
			</div>
		</section>
	);
}
