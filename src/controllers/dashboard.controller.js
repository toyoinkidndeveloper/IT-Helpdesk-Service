const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const dashboardController = {
  getDashboardData: async (req, res) => {
    try {
      const { departmentId } = req.query;
      
      const whereClause = {};
      if (departmentId && departmentId !== 'all') {
        whereClause.departmentId = parseInt(departmentId);
      }
      
      const [statusGroups, categories, ticketsForDays] = await Promise.all([
        prisma.ticket.groupBy({
          by: ['status'],
          _count: { status: true },
          where: whereClause
        }),
        prisma.ticket_category.findMany({
          select: {
            name: true,
            _count: {
              select: { tickets: { where: whereClause } }
            }
          }
        }),
        prisma.ticket.findMany({
          where: whereClause,
          select: { createdAt: true }
        })
      ]);
      
      const statusCounts = {
        OPEN: 0,
        IN_PROGRESS: 0,
        WAITING_FOR_USER: 0,
        RESOLVED: 0,
        CLOSED: 0,
      };

      statusGroups.forEach(group => {
        if (statusCounts[group.status] !== undefined) {
          statusCounts[group.status] = group._count.status;
        }
      });

      const colors = ["#4f46e5", "#60a5fa", "#2dd4bf", "#c084fc", "#94a3b8"];
      
      // Calculate pieChart (group by category)
      const pieChart = categories
        .filter(cat => cat._count.tickets > 0)
        .map((cat, index) => ({
          name: cat.name,
          value: cat._count.tickets,
          fill: colors[index % colors.length]
        }));

      // Group by day of week for Bar Chart
      const dayCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      ticketsForDays.forEach(t => {
        const d = new Date(t.createdAt);
        const dayName = days[d.getDay()];
        if (dayCounts[dayName] !== undefined) {
          dayCounts[dayName]++;
        }
      });
      
      const barChart = Object.keys(dayCounts)
        .filter(d => d !== 'Sat' && d !== 'Sun')
        .map((day, index) => ({
          name: day,
          value: dayCounts[day],
          fill: colors[index % colors.length]
        }));

      res.json({
        documentStatus: statusCounts,
        pieChart,
        barChart,
        canViewAll: true
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ message: "Error fetching dashboard", error: error.message });
    }
  },
  getQaPerformanceData: async (req, res) => {
    res.json([]);
  }
};

module.exports = dashboardController;
