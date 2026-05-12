import { num } from "./utils.js";

export const calculateCommissionTotals = (values) => {
  // 1. Core Counts & Manual Comms
  const act_count = num(values.activation_count);
  const act_comm = num(values.act_comm);
  const upg_count = num(values.upgrade_count);
  const upg_comm = num(values.upg_comm);
  const hint_sold = num(values.hint_sold);

  // 🔥 AUTO: Hint, Box, and Box Comm
  const hint_comm = hint_sold * 5;
  const qualified_box = act_count + upg_count + hint_sold;
  const box_comm = act_comm + upg_comm + hint_comm;

  // 🔥 AUTO: VAS Commission
  const vas_mrc = num(values.vas_mrc);
  const vas_avg = num(values.vas_avg);
  const vas_commission = vas_avg >= 10 ? vas_mrc * 0.35 * 0.1 : 0;
  // 🔥 AUTO: Leasing Commission
  const leasing_done = num(values.leasing_done);
  const leasing_commission = leasing_done * 5;

  // 🔥 AUTO: Retention Sum (All Tiers)
  const retention_commission =
    num(values.retention_35) +
    num(values.retention_65) +
    num(values.retention_95) +
    num(values.retention_125) +
    num(values.retention_155) +
    num(values.retention_185) +
    num(values.retention_215) +
    num(values.retention_245) +
    num(values.retention_275) +
    num(values.retention_305) +
    num(values.retention_335) +
    num(values.retention_365);

  const acc_commission = num(values.acc_commission);
  const his_spiff = num(values.his_spiff);

  // 🔥 AUTO: Total Commission
  const total_commission =
    box_comm +
    vas_commission +
    acc_commission +
    retention_commission +
    leasing_commission +
    his_spiff;

  const csat_comm_loss = total_commission * 0.1;

  // Deductions & Reimbursements
  const rebate_chargeback = num(values.rebate_chargeback);
  const deposit_chargeback = num(values.deposit_chargeback);
  const inventory_variance_chargeback = num(
    values.inventory_variance_chargeback,
  );
  const late_clock_in_chargeback = num(values.late_clock_in_chargeback);
  const write_ups = num(values.write_ups);

  // Reimbursements are added to the final payout, not deducted
  const reimbursements = num(values.reimbursements);

  // Total Deductions
  const total_deductions =
    rebate_chargeback +
    deposit_chargeback +
    inventory_variance_chargeback +
    late_clock_in_chargeback +
    write_ups +
    csat_comm_loss;

  // 🔥 AUTO: Final Commission
  const final_commission = total_commission - total_deductions + reimbursements;

  return {
    hint_comm,
    qualified_box,
    box_comm,
    vas_commission,
    leasing_commission,
    retention_commission,
    csat_comm_loss,
    total_deductions,
    total_commission,
    final_commission,
  };
};
