import { supabase } from '../services/supabase'

/**
 * Seeds a new user account with fake data for digital product design context
 * Creates 4 compartments and sample tasks
 */
export const seedUserData = async (userId) => {
  try {
    console.log(`🌱 Seeding data for user: ${userId}`)

    // Define compartments for digital product design
    const compartments = [
      {
        name: 'Product Strategy',
        position: 0,
        color_bg: '#EEF2FF',
        color_text: '#3730A3',
        color_border: '#C7D2FE'
      },
      {
        name: 'Design System',
        position: 1,
        color_bg: '#ECFEFF',
        color_text: '#155E75',
        color_border: '#A5F3FC'
      },
      {
        name: 'User Research',
        position: 2,
        color_bg: '#FEE2E2',
        color_text: '#991B1B',
        color_border: '#FECACA'
      },
      {
        name: 'Development',
        position: 3,
        color_bg: '#FAE8FF',
        color_text: '#6B21A8',
        color_border: '#F5D0FE'
      }
    ]

    // Insert compartments
    const { data: insertedCompartments, error: compartmentError } = await supabase
      .from('compartments')
      .insert(compartments.map(comp => ({ ...comp, user_id: userId })))
      .select()

    if (compartmentError) {
      throw new Error(`Failed to create compartments: ${compartmentError.message}`)
    }

    console.log(`✅ Created ${insertedCompartments.length} compartments`)

    // Get compartment IDs for task creation
    const compartmentMap = {}
    insertedCompartments.forEach(comp => {
      compartmentMap[comp.name] = comp.id
    })

    console.log(`✅ Created ${insertedCompartments.length} compartments (no sample tasks)`)
    console.log(`🎉 Successfully seeded user ${userId} with fake data`)

    return {
      compartments: insertedCompartments,
      tasks: []
    }

  } catch (error) {
    console.error('❌ Error seeding user data:', error)
    throw error
  }
}