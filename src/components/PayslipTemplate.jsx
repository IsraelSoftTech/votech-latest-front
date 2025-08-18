import React, { forwardRef } from 'react';

const formatCurrency = (amount) => {
	if (amount === null || amount === undefined) return '';
	return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(Math.round(amount));
};

const PayslipTemplate = forwardRef(function PayslipTemplate(
	{
		name,
		employmentNumber = '—',
		month,
		year,
		grossAmount,
		debitPercentCNPS = 0,
		structure = null,
	},
	ref
) {
	// Default structure mirrors the sample if no custom structure is provided
	const defaultStructure = [
		{ title: '1) AUXILARY ALLOWANCE', items: [
			{ code: 'a)', label: 'Transport & Calls', percent: 10 },
			{ code: 'b)', label: 'Job Responsibility', percent: 30 },
			{ code: 'i)', label: 'Executing and Reporting of personal administrative and teaching responsibility', note: true },
			{ code: 'ii)', label: 'Delegating, Coordinating and Reporting of administrative responsibilities of which you are the Leade.', note: true },
		]},
		{ title: '2) BASIC ESSENTIAL ALLOWANCE', items: [
			{ code: 'a)', label: 'Housing, Feeding, Health Care, Family Support, Social Security', percent: 30 },
			{ code: 'b)', label: 'C.N.P.S Personal Contribution', debitPercent: debitPercentCNPS, remark: '4% of Gross Salary' },
		]},
		{ title: '3) PROFESSIONAL & RESEARCH ALLOWANCE', items: [
			{ code: 'a)', label: 'Professional Development and Dressing support', percent: 20 },
		]},
		{ title: '4) BONUS ALLOWANCE', items: [
			{ code: 'a)', label: 'Longivity, Productivity, Creativity, Intrapreneurship', percent: 10 },
		]},
		{ title: '5) OTHERS', items: [
			{ code: 'a)', label: 'Socials' },
			{ code: 'b)', label: 'Niangi' },
		]},
	];

	const effective = Array.isArray(structure) ? structure : defaultStructure;

	const computeAmount = (percent) => (grossAmount * (percent || 0)) / 100;

	let grossCreditTotal = 0;
	let totalDebit = 0;

	// Build computed rows with amounts
	const computedSections = effective.map((section) => {
		const items = (section.items || []).map((item) => {
			const isDebit = typeof item.debitPercent === 'number' && !item.note;
			const isCredit = typeof item.percent === 'number' && !item.note && !isDebit;
			const creditAmount = isCredit ? computeAmount(item.percent) : undefined;
			const debitAmount = isDebit ? computeAmount(item.debitPercent) : undefined;
			if (creditAmount) grossCreditTotal += creditAmount;
			if (debitAmount) totalDebit += debitAmount;
			return { ...item, creditAmount, debitAmount };
		});
		// Subtotal percent is the sum of credit percents (notes and debits excluded)
		const subtotalPercent = items.reduce((sum, it) => sum + (typeof it.percent === 'number' && !it.note ? it.percent : 0), 0);
		const subtotalAmount = computeAmount(subtotalPercent);
		return { title: section.title, items, subtotalPercent, subtotalAmount };
	});

	const netPay = Math.max(0, grossCreditTotal - totalDebit);

	return (
		<div className="template-wrapper" ref={ref}>
			<div className="template-header">
				<div className="template-row"><span className="template-label">NAME:</span> <span className="template-value template-bold">{name}</span></div>
				<div className="template-row"><span className="template-label">EMPLOYMENT NUMBER:</span> <span className="template-value">{employmentNumber}</span></div>
				<div className="template-row"><span className="template-label">Month, Year:</span> <span className="template-value">{month} {year}</span></div>
			</div>

			<table className="template-table">
				<thead>
					<tr>
						<th className="col-sn">S/N</th>
						<th className="col-heading">HEADING</th>
						<th className="col-credit">CREDIT</th>
						<th className="col-debit">DEBIT</th>
						<th className="col-percent">%</th>
						<th className="col-remark">REMARK</th>
					</tr>
				</thead>
				<tbody>
					{computedSections.map((sec, sIndex) => (
						<React.Fragment key={sIndex}>
							<tr className="row-section">
								<td className="cell sn"></td>
								<td className="cell heading" colSpan={5}>{sec.title}</td>
							</tr>
							{sec.items.map((item, iIndex) => (
								<tr key={`${sIndex}-${iIndex}`}>
									<td className="cell sn">{item.code || ''}</td>
									<td className="cell text">{item.label}</td>
									<td className="cell number">{item.note || typeof item.debitPercent === 'number' ? '' : formatCurrency(item.creditAmount)}</td>
									<td className="cell number">{typeof item.debitPercent === 'number' ? formatCurrency(item.debitAmount) : ''}</td>
									<td className="cell number">{item.note ? '' : (typeof item.debitPercent === 'number' ? `${item.debitPercent}%` : (typeof item.percent === 'number' ? `${item.percent}%` : ''))}</td>
									<td className="cell text">{item.remark || ''}</td>
								</tr>
							))}
							{sec.subtotalPercent ? (
								<tr className="row-subtotal">
									<td className="cell sn" colSpan={1}></td>
									<td className="cell text">Sub Total {sIndex + 1}</td>
									<td className="cell number">{formatCurrency(sec.subtotalAmount)}</td>
									<td className="cell number"></td>
									<td className="cell number">{sec.subtotalPercent}%</td>
									<td className="cell text"></td>
								</tr>
							) : null}
						</React.Fragment>
					))}
					<tr className="row-total">
						<td className="cell sn" colSpan={1}></td>
						<td className="cell text">GROSS AMOUNTS</td>
						<td className="cell number">{formatCurrency(grossCreditTotal)}</td>
						<td className="cell number"></td>
						<td className="cell number"></td>
						<td className="cell text"></td>
					</tr>
					<tr className="row-total row-net">
						<td className="cell sn" colSpan={1}></td>
						<td className="cell text">NET PAY</td>
						<td className="cell number">{formatCurrency(netPay)}</td>
						<td className="cell number"></td>
						<td className="cell number"></td>
						<td className="cell text"></td>
					</tr>
				</tbody>
			</table>
		</div>
	);
});

export default PayslipTemplate; 