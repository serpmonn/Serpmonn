package ru.simpleapps.tipcalc

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import ru.simpleapps.tipcalc.ui.theme.TipCalculatorTheme
import java.math.BigDecimal
import java.math.RoundingMode

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TipCalculatorTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    TipCalculatorScreen()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TipCalculatorScreen() {
    val focusManager = LocalFocusManager.current

    var billText by remember { mutableStateOf("") }
    var tipPercent by remember { mutableFloatStateOf(10f) }
    var peopleCount by remember { mutableIntStateOf(1) }
    var rounding by remember { mutableStateOf(Rounding.None) }

    val billAmount = billText.toBigDecimalOrNull() ?: BigDecimal.ZERO

    val tipAmount = billAmount.multiply(BigDecimal(tipPercent.toDouble() / 100.0))
    val total = billAmount.add(tipAmount)

    val (finalTotal, perPerson) = remember(billAmount, tipAmount, total, peopleCount, rounding) {
        val baseTotal = total
        when (rounding) {
            Rounding.None -> baseTotal to safeDivide(baseTotal, peopleCount)
            Rounding.RoundTotal -> baseTotal.setScale(0, RoundingMode.HALF_UP) to safeDivide(baseTotal.setScale(0, RoundingMode.HALF_UP), peopleCount)
            Rounding.RoundPerPerson -> {
                val pp = safeDivide(baseTotal, peopleCount).setScale(0, RoundingMode.HALF_UP)
                (pp.multiply(BigDecimal(peopleCount))) to pp
            }
        }
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(title = { Text(text = stringResource(id = R.string.app_name)) })
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            OutlinedTextField(
                value = billText,
                onValueChange = { text ->
                    val cleaned = text.replace(',', '.')
                    if (cleaned.isEmpty() || cleaned.matches(Regex("^\\d*\\.?\\d*") )) {
                        billText = cleaned
                    }
                },
                label = { Text(text = stringResource(id = R.string.bill_amount)) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Decimal,
                    imeAction = ImeAction.Done
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(text = stringResource(id = R.string.tip_percentage, tipPercent.toInt()))
                Slider(
                    value = tipPercent,
                    onValueChange = { tipPercent = it },
                    valueRange = 0f..30f,
                    steps = 29
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(0, 5, 10, 12, 15, 18, 20).forEach { preset ->
                        FilterChip(
                            selected = tipPercent.toInt() == preset,
                            onClick = { tipPercent = preset.toFloat() },
                            label = { Text("${preset}%") }
                        )
                    }
                }
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(text = stringResource(id = R.string.people_count))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedButton(onClick = { if (peopleCount > 1) peopleCount -= 1 }) { Text("-") }
                    Text(
                        text = peopleCount.toString(),
                        modifier = Modifier.padding(horizontal = 12.dp)
                    )
                    Button(onClick = { peopleCount += 1 }) { Text("+") }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(text = stringResource(id = R.string.rounding))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AssistChip(
                        label = { Text(stringResource(id = R.string.rounding_none)) },
                        onClick = { rounding = Rounding.None },
                        leadingIcon = null,
                        enabled = rounding != Rounding.None
                    )
                    AssistChip(
                        label = { Text(stringResource(id = R.string.rounding_total)) },
                        onClick = { rounding = Rounding.RoundTotal },
                        leadingIcon = null,
                        enabled = rounding != Rounding.RoundTotal
                    )
                    AssistChip(
                        label = { Text(stringResource(id = R.string.rounding_per_person)) },
                        onClick = { rounding = Rounding.RoundPerPerson },
                        leadingIcon = null,
                        enabled = rounding != Rounding.RoundPerPerson
                    )
                }
            }

            Divider()

            SummaryRow(
                label = stringResource(id = R.string.tip_amount),
                value = formatCurrency(tipAmount)
            )
            SummaryRow(
                label = stringResource(id = R.string.total_amount),
                value = formatCurrency(finalTotal)
            )
            SummaryRow(
                label = stringResource(id = R.string.per_person),
                value = formatCurrency(perPerson)
            )

            Spacer(modifier = Modifier.height(24.dp))
            Button(
                onClick = { focusManager.clearFocus() },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(text = stringResource(id = R.string.done))
            }
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, style = MaterialTheme.typography.bodyLarge)
        Text(text = value, style = MaterialTheme.typography.titleLarge)
    }
}

private enum class Rounding { None, RoundTotal, RoundPerPerson }

private fun String.toBigDecimalOrNull(): BigDecimal? = try {
    if (this.isBlank()) null else this.toBigDecimal()
} catch (_: Throwable) {
    null
}

private fun safeDivide(amount: BigDecimal, peopleCount: Int): BigDecimal {
    return if (peopleCount <= 0) BigDecimal.ZERO else amount.divide(BigDecimal(peopleCount), 2, RoundingMode.HALF_UP)
}

private fun formatCurrency(amount: BigDecimal): String {
    return "${amount.setScale(2, RoundingMode.HALF_UP)} ₽"
}