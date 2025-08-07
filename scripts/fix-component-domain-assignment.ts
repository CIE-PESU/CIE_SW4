// Script to assign all lab components to the "Lab Components" domain
import { prisma } from '../lib/prisma'

async function assignLabComponentsToDomain() {
  try {
    console.log("=== ASSIGNING LAB COMPONENTS TO DOMAIN ===\n")

    // 1. Find the "Lab Components" domain
    const labComponentsDomain = await prisma.domain.findFirst({
      where: { name: 'Lab Components' }
    })

    if (!labComponentsDomain) {
      console.error("❌ 'Lab Components' domain not found!")
      return
    }

    console.log(`✅ Found 'Lab Components' domain: ${labComponentsDomain.id}`)

    // 2. Find all components without domain assignment
    const componentsWithoutDomain = await prisma.labComponent.findMany({
      where: {
        domain_id: null
      }
    })

    console.log(`📦 Found ${componentsWithoutDomain.length} components without domain assignment`)

    if (componentsWithoutDomain.length === 0) {
      console.log("✅ All components already have domain assignments!")
      return
    }

    // 3. Update all components to assign them to Lab Components domain
    const result = await prisma.labComponent.updateMany({
      where: {
        domain_id: null
      },
      data: {
        domain_id: labComponentsDomain.id
      }
    })

    console.log(`✅ Successfully assigned ${result.count} components to 'Lab Components' domain`)

    // 4. Verify the assignment
    const remainingWithoutDomain = await prisma.labComponent.count({
      where: {
        domain_id: null
      }
    })

    console.log(`✅ Components remaining without domain: ${remainingWithoutDomain}`)

    // 5. Test coordinator lookup for a sample component
    const sampleComponent = await prisma.labComponent.findFirst({
      where: {
        domain_id: labComponentsDomain.id
      },
      include: {
        domain: true
      }
    })

    if (sampleComponent) {
      const coordinator = await prisma.domainCoordinator.findFirst({
        where: { domain_id: sampleComponent.domain_id! },
        include: {
          faculty: {
            include: { user: true }
          }
        }
      })

      console.log(`\n🧪 Testing coordinator lookup for "${sampleComponent.component_name}":`)
      if (coordinator) {
        console.log(`✅ Coordinator found: ${coordinator.faculty.user.name}`)
        console.log("🎉 Component requests should now work!")
      } else {
        console.log(`❌ NO COORDINATOR FOUND! (This shouldn't happen)`)
      }
    }

  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

assignLabComponentsToDomain()
