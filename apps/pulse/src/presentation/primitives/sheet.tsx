'use client';

import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import * as React from 'react';
import { useLowFPS } from '@/core/hooks/use-low-fps';
import { cn } from '@/core/utils/cn';
import { Button } from '@/presentation/primitives/button';

// ---------------------------------------------------------------------------
// Slide variants per side
// ---------------------------------------------------------------------------
const slideVariants = {
	top: { hidden: { y: '-100%', opacity: 0 }, visible: { y: 0, opacity: 1 } },
	bottom: { hidden: { y: '100%', opacity: 0 }, visible: { y: 0, opacity: 1 } },
	left: { hidden: { x: '-100%', opacity: 0 }, visible: { x: 0, opacity: 1 } },
	right: { hidden: { x: '100%', opacity: 0 }, visible: { x: 0, opacity: 1 } },
} as const;

// ---------------------------------------------------------------------------
// Context — carries both the user-facing open state and the Base UI open gate.
//
// Strategy to fix exit animations:
//   • `open`       — real open state (drives AnimatePresence show/hide)
//   • `baseOpen`   — what Base UI's Root receives; stays `true` while exit plays
//   • `setOpen`    — user-facing setter (closes both immediately on open)
//   • `onExitComplete` — called by AnimatePresence; finally sets baseOpen=false
// ---------------------------------------------------------------------------
const SheetCtx = React.createContext<{
	open: boolean;
	baseOpen: boolean;
	onExitComplete: () => void;
}>({ open: false, baseOpen: false, onExitComplete: () => {} });

function Sheet({
	open: openProp,
	onOpenChange,
	defaultOpen,
	...props
}: SheetPrimitive.Root.Props) {
	const isControlled = openProp !== undefined;
	const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false);
	// baseOpen: what Base UI sees — stays true during exit so the Popup stays mounted.
	const [baseOpen, setBaseOpen] = React.useState(defaultOpen ?? false);

	const open = isControlled ? (openProp ?? false) : internalOpen;
	const openRef = React.useRef(open);

	// Called by Base UI Root — receives (open, event) so signature matches exactly.
	const handleRootChange = React.useCallback<
		NonNullable<SheetPrimitive.Root.Props['onOpenChange']>
	>(
		(v, event) => {
			if (!isControlled) setInternalOpen(v);
			onOpenChange?.(v, event);
			if (v) setBaseOpen(true); // opening: ungate Base UI immediately
			// closing: baseOpen stays true until onExitComplete fires
		},
		[isControlled, onOpenChange]
	);

	// If controlled and open flips to true externally, sync baseOpen.
	React.useEffect(() => {
		openRef.current = open;
		if (open) setBaseOpen(true);
	}, [open]);

	const onExitComplete = React.useCallback(() => {
		if (!openRef.current) setBaseOpen(false);
	}, []);

	return (
		<SheetCtx value={{ open, baseOpen, onExitComplete }}>
			<SheetPrimitive.Root
				data-slot="sheet"
				open={baseOpen}
				onOpenChange={handleRootChange}
				{...props}
			/>
		</SheetCtx>
	);
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
	return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
	return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
	return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

// ---------------------------------------------------------------------------
// SheetContent
// ---------------------------------------------------------------------------
function SheetContent({
	className,
	children,
	side = 'right',
	showCloseButton = true,
	...props
}: SheetPrimitive.Popup.Props & {
	side?: 'top' | 'right' | 'bottom' | 'left';
	showCloseButton?: boolean;
}) {
	const { open, onExitComplete } = React.use(SheetCtx);
	const isLowFPS = useLowFPS(30);
	const prefersReduced = useReducedMotion();
	const skipAnimation = isLowFPS || !!prefersReduced;

	const panelTransition = skipAnimation
		? { duration: 0 }
		: { type: 'spring' as const, stiffness: 300, damping: 30, mass: 0.85 };

	const overlayTransition = skipAnimation
		? { duration: 0 }
		: { duration: 0.25 };

	const { hidden, visible } = slideVariants[side];

	return (
		<SheetPortal>
			{/*
			 * AnimatePresence keeps children mounted during exit.
			 * onExitComplete fires after ALL children finish exiting,
			 * which is when we finally set baseOpen=false on Base UI.
			 */}
			<AnimatePresence onExitComplete={onExitComplete}>
				{open && (
					<SheetPrimitive.Backdrop
						key="sheet-overlay"
						render={
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={overlayTransition}
							/>
						}
						className="fixed inset-0 z-50 bg-black/20"
					/>
				)}

				{open && (
					<SheetPrimitive.Popup
						key={`sheet-panel-${side}`}
						data-slot="sheet-content"
						data-side={side}
						render={
							<motion.div
								initial={hidden}
								animate={visible}
								exit={hidden}
								transition={panelTransition}
							/>
						}
						className={cn(
							'fixed z-50 flex flex-col border border-border-gradient bg-surface/75 bg-clip-padding text-sm text-popover-foreground shadow-2xl shadow-accent/5 backdrop-blur-3xl will-change-transform',
							side === 'bottom' && 'inset-x-0 bottom-0 h-auto border-t',
							side === 'left' &&
								'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-xl',
							side === 'right' &&
								'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-xl',
							side === 'top' && 'inset-x-0 top-0 h-auto border-b',
							className
						)}
						{...props}
					>
						{children}
						{showCloseButton && (
							<SheetPrimitive.Close
								data-slot="sheet-close"
								render={
									<Button
										variant="ghost"
										className="absolute top-4 right-4 bg-secondary"
										size="icon-sm"
									/>
								}
							>
								<XIcon />
								<span className="sr-only">Close</span>
							</SheetPrimitive.Close>
						)}
					</SheetPrimitive.Popup>
				)}
			</AnimatePresence>
		</SheetPortal>
	);
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="sheet-header"
			className={cn('flex flex-col gap-1.5 p-6', className)}
			{...props}
		/>
	);
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="sheet-footer"
			className={cn('mt-auto flex flex-col gap-2 p-6', className)}
			{...props}
		/>
	);
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
	return (
		<SheetPrimitive.Title
			data-slot="sheet-title"
			className={cn('text-base font-medium text-foreground', className)}
			{...props}
		/>
	);
}

function SheetDescription({
	className,
	...props
}: SheetPrimitive.Description.Props) {
	return (
		<SheetPrimitive.Description
			data-slot="sheet-description"
			className={cn('text-sm text-muted-foreground', className)}
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
};
