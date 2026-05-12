const parseNum = (val) => {
  if (!val) return 0;
  const parsed = parseFloat(String(val).replace(/[$,\s]/g, ""));
  return isNaN(parsed) ? 0 : parsed;
};

export const calculatePayrollTotals = (formData) => {
  const isPayrate = formData.pay_type === "payrate";
  const isSalaried = formData.pay_type === "salaried";
  const isResigning = formData.employee_stats === "resigning";
  const isNewlyJoined = formData.employee_stats === "newlyjoined";

  const payRate = parseNum(formData.pay_rate);
  const payRateHike = parseNum(formData.pay_rate_hike);
  const salary = parseNum(formData.salary);
  const salaryHike = parseNum(formData.salary_hike);

  const wd1 = parseNum(formData.working_days_1);
  const hw1 = parseNum(formData.hours_worked_1);
  const wd2 = parseNum(formData.working_days_2);
  const hw2 = parseNum(formData.hours_worked_2);
  const hrsAdj = parseNum(formData.hours_adjusted);
  const daysAdj = parseNum(formData.days_adjusted);

  const totalDaysToWork = parseNum(formData.total_days_to_work);
  const loansAdvances = parseNum(formData.loans_advances);
  const reimbursements = parseNum(formData.reimbursements);

  let total_days_worked = 0;
  let total_hours = 0;
  let gross_pay = 0;
  let lop_count = 0;
  let credits = 0;
  let deductions = 0;
  let net_pay = 0;
  let net_final_pay = 0;

  if (isPayrate) {
    const activeRate = payRateHike > 0 ? payRateHike : payRate;

    total_days_worked = wd1 + wd2;
    total_hours = hw1 + hw2 + hrsAdj;

    net_pay = total_hours * activeRate + reimbursements - loansAdvances;
    net_final_pay = net_pay;
  } else if (isSalaried) {
    const activeSalary = salaryHike > 0 ? salaryHike : salary;
    const divisor = isNewlyJoined ? 4.0 : 4.33;

    total_days_worked = wd1 + wd2 + daysAdj;
    total_hours = hw1 + hw2;
    gross_pay = activeSalary / 2;

    // 🔥 FIX: ALWAYS read LOP Count directly from the form so manual edits work!
    lop_count = parseNum(formData.lop_count);

    const dailyRate =
      totalDaysToWork > 0 ? activeSalary / divisor / totalDaysToWork : 0;

    // 🔥 Mathematical Convention:
    // Positive LOP = Credits (Worked extra days)
    // Negative LOP = Deductions (Missed days)
    if (lop_count > 0) {
      credits = dailyRate * lop_count;
    } else if (lop_count < 0) {
      deductions = dailyRate * Math.abs(lop_count);
    }

    net_pay =
      gross_pay + credits + reimbursements - (deductions + loansAdvances);
    net_final_pay = net_pay;
  }

  return {
    total_days_worked,
    total_hours,
    gross_pay,
    lop_count,
    credits,
    deductions,
    net_pay,
    net_final_pay,
  };
};
