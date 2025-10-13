"use client";
import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import SuperAdminLayout from '@/components/SuperAdminLayout';

function timeAgo(iso) {
	const then = new Date(iso);
	const diff = Date.now() - then.getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	const days = Math.floor(hrs / 24);
	return `${days}d ago`;
}

export default function AuditTrailsPage() {
	const [loading, setLoading] = useState(true);
	const [records, setRecords] = useState([]);
	const [query, setQuery] = useState('');
	const [roleFilter, setRoleFilter] = useState('ALL');
	const [actionFilter, setActionFilter] = useState('ALL');

	useEffect(() => {
		let mounted = true;
			setLoading(true);
			fetch('/api/audit-trails')
			.then((r) => r.json())
			.then((json) => {
				if (!mounted) return;
					setRecords(Array.isArray(json?.data) ? json.data : []);
			})
			.catch((err) => {
				console.error('Failed to load audit trails', err);
				setRecords([]);
			})
			.finally(() => mounted && setLoading(false));

		return () => {
			mounted = false;
		};
	}, []);

	const roles = useMemo(() => {
		const s = new Set(records.map((r) => r.actorRole || 'UNKNOWN'));
		return ['ALL', ...Array.from(s)];
	}, [records]);

	const actions = useMemo(() => {
		const s = new Set(records.map((r) => r.action || 'UNKNOWN'));
		return ['ALL', ...Array.from(s)];
	}, [records]);

	const filtered = useMemo(() => {
		return records.filter((r) => {
			if (roleFilter !== 'ALL' && r.actorRole !== roleFilter) return false;
			if (actionFilter !== 'ALL' && r.action !== actionFilter) return false;
			if (query) {
				const q = query.toLowerCase();
				return (
					(r.actorName || '').toLowerCase().includes(q) ||
					(r.entity || '').toLowerCase().includes(q) ||
					(r.details || '').toLowerCase().includes(q)
				);
			}
			return true;
		});
	}, [records, roleFilter, actionFilter, query]);

	// Group adjacent records by actor to avoid repeating actor header
	const grouped = useMemo(() => {
		const groups = [];
		for (const r of filtered) {
			const last = groups[groups.length - 1];
			if (last && last.actorName === r.actorName && last.actorRole === r.actorRole && last.actorId === r.actorId) {
				last.items.push(r);
			} else {
				groups.push({ actorId: r.actorId || null, actorName: r.actorName, actorRole: r.actorRole, items: [r] });
			}
		}
		return groups;
	}, [filtered]);

	// Modal state for showing actor profile
	const [modalOpen, setModalOpen] = useState(false);
	const [modalActor, setModalActor] = useState(null);
	const [modalLoading, setModalLoading] = useState(false);

	// Full entry modal
	const [entryModalOpen, setEntryModalOpen] = useState(false);
	const [entryData, setEntryData] = useState(null);

	function openEntryModal(entry) {
		let parsed = null;
		try { parsed = JSON.parse(entry.details); } catch (e) { parsed = null; }
		setEntryData({ raw: entry, parsed });
		setEntryModalOpen(true);
	}

	function closeEntryModal() {
		setEntryModalOpen(false);
		setEntryData(null);
	}

	function fmtDate(d) {
		if (!d) return '—';
		try { return new Date(d).toLocaleString(); } catch (e) { return String(d); }
	}

	function fmtMoney(cents) {
		if (cents === undefined || cents === null) return '—';
		return `₱${(Number(cents) / 100).toFixed(2)}`;
	}

	function fmtDateFull(d) {
		if (!d) return '—';
		try {
			const dt = new Date(d);
			return dt.toLocaleString();
		} catch (e) { return String(d); }
	}

	function renderBookingDetails(snapshot = {}) {
		if (!snapshot) return <div>No data</div>;
		return (
			<div>
				<div><strong>Name:</strong> {snapshot.guestName || '—'}</div>
				<div><strong>Check in:</strong> {fmtDateFull(snapshot.checkIn)}</div>
				<div><strong>Check out:</strong> {fmtDateFull(snapshot.checkOut)}</div>
				<div><strong>Created time:</strong> {fmtDateFull(snapshot.createdAt || snapshot.created)}</div>
				<div><strong>Status:</strong> {snapshot.status || snapshot.paymentStatus || '—'}</div>
				<div><strong>Updated time:</strong> {fmtDateFull(snapshot.updatedAt || snapshot.updated)}</div>
				<div style={{ marginTop: 8 }}><strong>Optional Amenities:</strong>{renderAmenities(snapshot.optionalAmenities)}</div>
				<div style={{ marginTop: 8 }}><strong>Rental Amenities:</strong>{renderAmenities(snapshot.rentalAmenities)}</div>
				<div style={{ marginTop: 8 }}><strong>Cottage:</strong> {snapshot.cottage || snapshot.cottageName || snapshot.roomName || '—'}</div>
			</div>
		);
	}

	function computeChanges(before = {}, after = {}) {
		const keys = ['guestName','checkIn','checkOut','status','paymentStatus','totalPrice'];
		const changes = [];

		for (const k of keys) {
			const b = before[k];
			const a = after[k];
			if (k === 'checkIn' || k === 'checkOut') {
				if (String(b) !== String(a)) changes.push({ field: k, before: fmtDate(b), after: fmtDate(a) });
				continue;
			}
			if (k === 'totalPrice') {
				if (Number(b || 0) !== Number(a || 0)) changes.push({ field: k, before: fmtMoney(b), after: fmtMoney(a) });
				continue;
			}
			if (String(b) !== String(a)) changes.push({ field: k, before: b ?? '—', after: a ?? '—' });
		}

		// Rooms diff (if present)
		const prevRooms = (before.rooms || []).reduce((acc, r) => { acc[r.roomId || r.room?.id || r.id] = (r.quantity ?? 1); return acc; }, {});
		const newRooms = (after.rooms || []).reduce((acc, r) => { acc[r.roomId || r.room?.id || r.id] = (r.quantity ?? 1); return acc; }, {});
		const allRoomIds = new Set([...Object.keys(prevRooms), ...Object.keys(newRooms)]);
		const roomChanges = [];
		allRoomIds.forEach((rid) => {
			const prevQ = prevRooms[rid] || 0;
			const newQ = newRooms[rid] || 0;
			if (prevQ !== newQ) {
				// try to find a friendly room name
				const prevName = (before.rooms || []).find(r => String(r.roomId || r.room?.id || r.id) === String(rid))?.room?.name;
				const newName = (after.rooms || []).find(r => String(r.roomId || r.room?.id || r.id) === String(rid))?.room?.name;
				const name = newName || prevName || `Room ${rid}`;
				roomChanges.push({ field: 'rooms', name, before: prevQ, after: newQ });
			}
		});
		if (roomChanges.length) changes.push({ field: 'rooms', changes: roomChanges });

		return changes;
	}

	function renderRooms(rooms = []) {
		if (!rooms || rooms.length === 0) return <div>None</div>;
		return (
			<ul style={{ margin: 0, paddingLeft: 16 }}>
				{rooms.map((r, i) => {
					const name = r.room?.name || r.roomName || `Room ${r.roomId || r.id}`;
					const qty = r.quantity ?? 1;
					const price = r.room?.price ?? r.price ?? null;
					return (
						<li key={i}>{name} — qty: {qty}{price ? ` — ${fmtMoney(price)}` : ''}</li>
					);
				})}
			</ul>
		);
	}

	function renderAmenities(list = [], keyName = 'name') {
		if (!list || list.length === 0) return <div>None</div>;
		return (
			<ul style={{ margin: 0, paddingLeft: 16 }}>
				{list.map((a, i) => (
					<li key={i}>{a[keyName] || a.name || `Item ${i+1}`}{a.quantity ? ` — qty: ${a.quantity}` : ''}{a.totalPrice ? ` — ${fmtMoney(a.totalPrice)}` : ''}</li>
				))}
			</ul>
		);
	}

	function renderBookingSummary(snapshot = {}) {
		if (!snapshot) return <div>No data</div>;
		return (
			<div>
				<div><strong>Guest</strong>: {snapshot.guestName || '—'}</div>
				<div><strong>Dates</strong>: {fmtDate(snapshot.checkIn)} → {fmtDate(snapshot.checkOut)}</div>
				<div style={{ marginTop: 8 }}><strong>Rooms</strong>:{renderRooms(snapshot.rooms)}</div>
				<div style={{ marginTop: 8 }}><strong>Optional Amenities</strong>:{renderAmenities(snapshot.optionalAmenities, 'optionalAmenity' in (snapshot.optionalAmenities?.[0]||{}) ? 'optionalAmenity' : 'name')}</div>
				<div style={{ marginTop: 8 }}><strong>Rental Amenities</strong>:{renderAmenities(snapshot.rentalAmenities, 'rentalAmenity' in (snapshot.rentalAmenities?.[0]||{}) ? 'rentalAmenity' : 'name')}</div>
				<div style={{ marginTop: 8 }}><strong>Total</strong>: {fmtMoney(snapshot.totalPrice)}</div>
			</div>
		);
	}

	async function openActorModal(group) {
		setModalOpen(true);
		setModalActor(null);
		if (!group.actorId) {
			// No actorId — show name/role only
			setModalActor({ name: group.actorName, role: group.actorRole });
			return;
		}
		setModalLoading(true);
		try {
			const res = await fetch(`/api/user/${group.actorId}`);
			if (!res.ok) throw new Error('Failed to fetch user');
			const user = await res.json();
			setModalActor(user);
		} catch (err) {
			console.error('Failed to load actor profile', err);
			setModalActor({ name: group.actorName, role: group.actorRole });
		} finally {
			setModalLoading(false);
		}
	}

	function closeModal() {
		setModalOpen(false);
		setModalActor(null);
	}

		return (
			<SuperAdminLayout activePage="audit-trails">
				<div className={styles.container}>
					<div className={styles.header}>
				<div>
					<div className={styles.title}>Audit Trails</div>
					<div className="subtitle">Records of administrative changes across the system</div>
				</div>

				<div className={styles.controls}>
					<input
						aria-label="Search audit trails"
						placeholder="Search by actor, entity or details"
						className={styles.search}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>

					<select className={styles.filter} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
						{roles.map((r) => (
							<option key={r} value={r}>{r}</option>
						))}
					</select>

					<select className={styles.filter} value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
						{actions.map((a) => (
							<option key={a} value={a}>{a}</option>
						))}
					</select>
				</div>
			</div>

			{loading ? (
				<div className={styles.empty}>Loading audit trails…</div>
			) : filtered.length === 0 ? (
				<div className={styles.empty}>No audit records found.</div>
			) : (
				<div className={styles.list}>
					{grouped.map((g, gi) => (
						<div key={`${g.actorName}-${gi}`} className={styles.group}>
							<div className={styles.groupItems}>
								{g.items.map((r) => (
									<div className={styles.card} key={r.id} onClick={() => openEntryModal(r)} style={{ cursor: 'pointer' }}>
										<div className={styles.avatar} title={r.actorName} onClick={(e) => { e.stopPropagation(); openActorModal({ actorId: r.actorId, actorName: r.actorName, actorRole: r.actorRole }); }} style={{ cursor: 'pointer' }}>{(r.actorName || '?').split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
										<div className={styles.meta}>
											<div className={styles.metaTop}>
												<div>
													<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
														<div style={{ fontWeight: 700, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); openActorModal({ actorId: r.actorId, actorName: r.actorName, actorRole: r.actorRole }); }}>{r.actorName}</div>
														<div className={styles.role} style={{ fontSize: '0.7rem' }}>{r.actorRole}</div>
														<div style={{ marginLeft: '8px', color: '#6b7280' }}>·</div>
														<div style={{ color: '#6b7280', fontSize: '0.85rem' }} title={new Date(r.timestamp).toLocaleString()}>{timeAgo(r.timestamp)}</div>
													</div>
													{/* Prefer human summary from structured details when available; hide backend-only labels like 'UPDATE Room' */}
													{(() => {
														let parsed = null;
														try { parsed = JSON.parse(r.details); } catch (e) { parsed = null; }
														// If this is a booking create, don't duplicate a preview here (we show it in the card details below)
														if (r.action === 'CREATE' && r.entity === 'Booking') {
															return null;
														}
														if (parsed && parsed.summary) {
															return <div className={styles.details} style={{ marginTop: '6px' }}>{parsed.summary}</div>;
														}
														// If we have before/after and it's a Room update that changed the name, show a friendly message
														if (parsed && parsed.before && parsed.after && r.action === 'UPDATE' && r.entity === 'Room') {
															const beforeName = parsed.before.name || parsed.before.roomName || parsed.before.title || null;
															const afterName = parsed.after.name || parsed.after.roomName || parsed.after.title || null;
															if (beforeName && afterName && beforeName !== afterName) {
																return <div className={styles.details} style={{ marginTop: '6px' }}>Updated room "{beforeName}" → "{afterName}"</div>;
															}
														}
														// Hide raw backend update labels for Room entities when not informative
														if (r.action === 'UPDATE' && r.entity === 'Room') return null;
														return <div className={styles.details} style={{ marginTop: '6px' }}><span className={styles.action}>{r.action}</span> {r.entity}</div>;
													})()}
												</div>
                                                
											</div>
											{/* Show concise preview in the card; full JSON is available in modal when clicked */}
											<div className={styles.details}>
												{(() => {
													let parsed = null;
													try { parsed = JSON.parse(r.details); } catch (e) { parsed = null; }
													if (r.action === 'CREATE' && r.entity === 'Booking') {
														// concise single-line preview
														return 'Booking created: ' + (parsed?.summary || (parsed?.guestName ? parsed.guestName : 'New booking'));
													}
													if (parsed && parsed.summary) return parsed.summary;
													// For other cases, show a short raw fallback (first 120 chars)
													if (typeof r.details === 'string') return r.details.length > 120 ? r.details.slice(0, 120) + '…' : r.details;
													return '';
												})()}
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
						)}
					</div>

				{/* Actor profile modal */}
				{modalOpen && (
					<div className={styles.modalBackdrop} onClick={closeModal}>
						<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
							<button className={styles.modalClose} onClick={closeModal}>×</button>
							{modalLoading ? (
								<div>Loading...</div>
							) : modalActor ? (
								<div>
									<div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
										<div style={{ width: 64, height: 64, borderRadius: 8, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{(modalActor.name || '?').split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
										<div>
											<div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{modalActor.name}</div>
											<div style={{ color: '#666' }}>{modalActor.role || modalActor.actorRole}</div>
										</div>
									</div>
									<hr style={{ margin: '12px 0' }} />
									<div>
										{modalActor.email && <div><strong>Email:</strong> {modalActor.email}</div>}
										{modalActor.contactNumber && <div><strong>Phone:</strong> {modalActor.contactNumber}</div>}
										{modalActor.redirectUrl && <div><strong>Redirect:</strong> {modalActor.redirectUrl}</div>}
										{/* Add other profile fields as available */}
									</div>
								</div>
							) : (
								<div>No profile available</div>
							)}
						</div>
					</div>
				)}

					{/* Full entry modal */}
					{entryModalOpen && entryData && (
						<div className={styles.modalBackdrop} onClick={closeEntryModal}>
							<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
								<button className={styles.modalClose} onClick={closeEntryModal}>×</button>
								<h3 style={{ marginTop: 0 }}>{entryData.raw.action} {entryData.raw.entity}</h3>
								<div style={{ color: '#6b7280', marginBottom: 12 }}>{timeAgo(entryData.raw.timestamp)} — by {entryData.raw.actorName} ({entryData.raw.actorRole})</div>
								{entryData.parsed ? (
									// If parsed JSON exists, display a concise Last form and Change applied
									<div>
										{entryData.parsed.summary && <div style={{ marginBottom: 8 }}>{entryData.parsed.summary}</div>}
										{entryData.parsed.before && entryData.parsed.after && (
											<div style={{ display: 'flex', gap: 16 }}>
												<div style={{ flex: 1 }}>
													<strong>Last form</strong>
													<div style={{ marginTop: 8 }}>
														<div><strong>Guest</strong>: {entryData.parsed.before.guestName || '—'}</div>
														<div><strong>Dates</strong>: {fmtDate(entryData.parsed.before.checkIn)} → {fmtDate(entryData.parsed.before.checkOut)}</div>
														<div><strong>Rooms</strong>:</div>
														<pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 8, borderRadius: 6 }}>{JSON.stringify((entryData.parsed.before.rooms || []).map(r=>({ roomId: r.roomId || r.room?.id || r.id, quantity: r.quantity || 1, name: r.room?.name || r.roomName || undefined })), null, 2)}</pre>
														<div><strong>Total</strong>: {fmtMoney(entryData.parsed.before.totalPrice)}</div>
													</div>
												</div>
												<div style={{ flex: 1 }}>
													<strong>Change applied</strong>
													<div style={{ marginTop: 8 }}>
														{computeChanges(entryData.parsed.before, entryData.parsed.after).length ? (
															<ul>
																{computeChanges(entryData.parsed.before, entryData.parsed.after).map((c, i) => (
																	<li key={i}>
																		{c.field === 'rooms' ? (
																			<div>{c.changes.map(rc => `${rc.name}: ${rc.before} → ${rc.after}`).join('; ')}</div>
																		) : (
																		<div><strong>{c.field}</strong>: {c.before} → {c.after}</div>
																		)}
																	</li>
																))}
															</ul>
														) : (
															<div>No field-level changes detected.</div>
														)}
													</div>
												</div>
											</div>
										)}
										{!(entryData.parsed.before && entryData.parsed.after) && (
											<div>
												{entryData.raw.entity === 'Booking' ? renderBookingDetails(entryData.parsed) : <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 8, borderRadius: 6 }}>{JSON.stringify(entryData.parsed, null, 2)}</pre>}
											</div>
										)}
									</div>
								) : (
									// Fallback: show raw details
									<div>
										<pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 8, borderRadius: 6 }}>{entryData.raw.details}</pre>
									</div>
								)}
							</div>
						</div>
					)}
			</SuperAdminLayout>
			);
}

